import io
from fpdf import FPDF
from PIL import Image as PILImage

from fastapi import (
    FastAPI, Depends, HTTPException, UploadFile, File, Form, Response
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from database import engine, get_db
import models
import schemas

# Create all tables (idempotent — safe to call on startup)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pokémon Card Binder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_MIME  = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
TAG_PALETTE   = ["#e63946","#3b4cca","#ffcb05","#2dc653","#9b5de5","#f77f00","#e040fb","#00b4d8"]


# ──────────────────────────────────────────────────────────────────────────────
# Root
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Pokémon Binder API is running 🎴", "docs": "/docs"}


# ──────────────────────────────────────────────────────────────────────────────
# Binder routes
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/binders", response_model=List[schemas.BinderOut])
def list_binders(db: Session = Depends(get_db)):
    return (
        db.query(models.Binder)
        .order_by(models.Binder.created_at.desc())
        .all()
    )


@app.post("/binders", response_model=schemas.BinderOut, status_code=201)
def create_binder(payload: schemas.BinderCreate, db: Session = Depends(get_db)):
    binder = models.Binder(**payload.model_dump())
    db.add(binder)
    db.commit()
    db.refresh(binder)
    return binder


@app.get("/binders/{binder_id}", response_model=schemas.BinderDetail)
def get_binder(binder_id: int, db: Session = Depends(get_db)):
    binder = db.query(models.Binder).filter(models.Binder.id == binder_id).first()
    if not binder:
        raise HTTPException(status_code=404, detail="Binder not found")
    return binder


@app.put("/binders/{binder_id}", response_model=schemas.BinderOut)
def update_binder(
    binder_id: int, payload: schemas.BinderCreate, db: Session = Depends(get_db)
):
    binder = db.query(models.Binder).filter(models.Binder.id == binder_id).first()
    if not binder:
        raise HTTPException(status_code=404, detail="Binder not found")
    for key, value in payload.model_dump().items():
        setattr(binder, key, value)
    db.commit()
    db.refresh(binder)
    return binder


@app.delete("/binders/{binder_id}", status_code=204)
def delete_binder(binder_id: int, db: Session = Depends(get_db)):
    binder = db.query(models.Binder).filter(models.Binder.id == binder_id).first()
    if not binder:
        raise HTTPException(status_code=404, detail="Binder not found")
    db.delete(binder)
    db.commit()
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Search
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/binders/{binder_id}/cards/search", response_model=List[schemas.CardOut])
def search_cards(
    binder_id: int,
    q: Optional[str] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db),
):
    binder = db.query(models.Binder).filter(models.Binder.id == binder_id).first()
    if not binder:
        raise HTTPException(status_code=404, detail="Binder not found")

    query = db.query(models.Card).filter(models.Card.binder_id == binder_id)

    if q:
        query = query.filter(models.Card.name.ilike(f"%{q}%"))

    if tag:
        query = query.join(models.Card.tags).filter(
            models.Tag.name == tag.strip().lower()
        )

    return query.order_by(models.Card.slot).all()


# ──────────────────────────────────────────────────────────────────────────────
# Card routes
# ──────────────────────────────────────────────────────────────────────────────

ALLOWED_TYPES = {"Fire", "Water", "Grass", "Fighting", "Steel", "Electric", "Dark", "Psychic", "Dragon", "Colorless"}

@app.post("/binders/{binder_id}/cards", response_model=schemas.CardOut, status_code=201)
async def upload_card(
    binder_id: int,
    name: str  = Form(...),
    slot: int  = Form(...),
    card_type: str = Form(...),
    file: UploadFile = File(...),
    tags: str  = Form(default=""),
    db: Session = Depends(get_db),
):
    # 1. Binder must exist
    binder = db.query(models.Binder).filter(models.Binder.id == binder_id).first()
    if not binder:
        raise HTTPException(status_code=404, detail="Binder not found")

    # 1.5. Validate Type
    if card_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid card type '{card_type}'. Allowed: {ALLOWED_TYPES}"
        )

    # 2. Slot range check
    total_slots = binder.pages * (binder.grid_size ** 2)
    if slot < 0 or slot >= total_slots:
        raise HTTPException(
            status_code=400,
            detail=f"Slot {slot} is out of range [0, {total_slots - 1}]",
        )

    # 3. MIME check
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. Allowed: {ALLOWED_MIME}",
        )

    # 4. Read + size check
    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MB limit")

    # 5. Create card
    card = models.Card(
        binder_id=binder_id,
        name=name,
        slot=slot,
        card_type=card_type,
        image_data=image_bytes,
        image_mime=content_type,
    )

    # 6. Resolve tags
    if tags.strip():
        tag_names = [t.strip().lower() for t in tags.split(",") if t.strip()]
        tag_objects = []
        for i, tag_name in enumerate(tag_names):
            existing = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
            if existing:
                tag_objects.append(existing)
            else:
                color = TAG_PALETTE[hash(tag_name) % len(TAG_PALETTE)]
                new_tag = models.Tag(name=tag_name, color=color)
                db.add(new_tag)
                db.flush()
                tag_objects.append(new_tag)
        card.tags = tag_objects

    db.add(card)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Slot is already occupied")
    db.refresh(card)
    return card


@app.get("/cards/{card_id}/image")
def get_card_image(card_id: int, db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return Response(
        content=bytes(card.image_data),
        media_type=card.image_mime,
        headers={"Cache-Control": "max-age=86400"},
    )


@app.delete("/cards/{card_id}", status_code=204)
def delete_card(card_id: int, db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    return None


@app.put("/cards/{card_id}/move", response_model=schemas.CardOut)
def move_card(card_id: int, payload: schemas.CardMove, db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    binder = db.query(models.Binder).filter(models.Binder.id == card.binder_id).first()
    total_slots = binder.pages * (binder.grid_size ** 2)
    if payload.slot < 0 or payload.slot >= total_slots:
        raise HTTPException(
            status_code=400,
            detail=f"Slot {payload.slot} is out of range [0, {total_slots - 1}]",
        )

    card.slot = payload.slot
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Target slot is already occupied")
    db.refresh(card)
    return card


# ──────────────────────────────────────────────────────────────────────────────
# Tag routes
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/tags", response_model=List[schemas.TagOut])
def list_tags(db: Session = Depends(get_db)):
    return db.query(models.Tag).order_by(models.Tag.name).all()


@app.post("/tags", response_model=schemas.TagOut, status_code=201)
def create_tag(payload: schemas.TagCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Tag).filter(models.Tag.name == payload.name).first()
    if existing:
        return existing
    tag = models.Tag(**payload.model_dump())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@app.post("/cards/{card_id}/tags/{tag_id}", response_model=schemas.CardOut)
def add_tag_to_card(card_id: int, tag_id: int, db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    if tag not in card.tags:
        card.tags.append(tag)
        db.commit()
        db.refresh(card)
    return card


@app.delete("/cards/{card_id}/tags/{tag_id}", status_code=204)
def remove_tag_from_card(card_id: int, tag_id: int, db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if tag and tag in card.tags:
        card.tags.remove(tag)
        db.commit()
    return None


# ──────────────────────────────────────────────────────────────────────────────
# PDF Export
# ──────────────────────────────────────────────────────────────────────────────

def _hex_to_rgb(hex_color: str) -> tuple:
    h = hex_color.lstrip("#")
    if len(h) != 6:
        return (100, 100, 100)
    try:
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    except ValueError:
        return (100, 100, 100)


@app.get("/binders/{binder_id}/export")
def export_binder_pdf(binder_id: int, db: Session = Depends(get_db)):
    binder = db.query(models.Binder).filter(models.Binder.id == binder_id).first()
    if not binder:
        raise HTTPException(status_code=404, detail="Binder not found")

    cards = sorted(binder.cards, key=lambda c: c.slot)

    # Build a slot-indexed map
    slot_map = {c.slot: c for c in cards}

    # ── Layout constants (all in mm) ─────────────────────────────────────────
    MARGIN   = 12
    PAGE_W   = 210
    PAGE_H   = 297
    HEADER_H = 14
    FOOTER_H = 8
    GAP      = 2.5
    gs       = binder.grid_size
    avail_w  = PAGE_W - 2 * MARGIN
    avail_h  = PAGE_H - 2 * MARGIN - HEADER_H - FOOTER_H
    cell_w   = avail_w / gs
    cell_h   = avail_h / gs
    img_w    = cell_w - GAP
    img_h    = cell_h - GAP

    binder_rgb = _hex_to_rgb(binder.color)
    label_h    = 6   # mm — name label height inside card cell
    pill_h     = 4   # mm — tag pill height

    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(False)

    total_pages = binder.pages
    total_cards = len(cards)
    pocket_label = {2: "4-Pocket", 3: "9-Pocket", 4: "16-Pocket"}.get(gs, f"{gs*gs}-Pocket")

    for page_idx in range(total_pages):
        pdf.add_page()

        # ── Header ───────────────────────────────────────────────────────────
        r, g, b = binder_rgb
        pdf.set_fill_color(r, g, b)
        pdf.rect(0, 0, PAGE_W, HEADER_H + 2, style="F")

        # Binder name (left)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(MARGIN, 3)
        pdf.cell(avail_w * 0.7, 8, binder.name[:60], align="L")

        # Page number (right)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_xy(MARGIN + avail_w * 0.7, 3)
        pdf.cell(avail_w * 0.3, 8, f"Page {page_idx + 1} / {total_pages}", align="R")

        # ── Grid ─────────────────────────────────────────────────────────────
        grid_top = MARGIN + HEADER_H

        for row in range(gs):
            for col in range(gs):
                abs_slot = page_idx * gs * gs + row * gs + col
                x = MARGIN + col * cell_w + GAP / 2
                y = grid_top + row * cell_h + GAP / 2

                card = slot_map.get(abs_slot)

                if card:
                    # ── Render card image ─────────────────────────────────
                    rendered = False
                    try:
                        img_bytes = bytes(card.image_data)
                        # Convert to RGB PNG via Pillow for fpdf2 compatibility
                        pil_img = PILImage.open(io.BytesIO(img_bytes)).convert("RGB")
                        buf = io.BytesIO()
                        pil_img.save(buf, format="PNG")
                        buf.seek(0)
                        pdf.image(buf, x=x, y=y, w=img_w, h=img_h - label_h - pill_h)
                        rendered = True
                    except Exception:
                        pass

                    if not rendered:
                        # Gray placeholder
                        pdf.set_fill_color(60, 60, 70)
                        pdf.rect(x, y, img_w, img_h - label_h - pill_h, style="F")

                    # ── Name label ────────────────────────────────────────
                    name_y = y + img_h - label_h - pill_h
                    pdf.set_fill_color(15, 15, 20)
                    pdf.rect(x, name_y, img_w, label_h, style="F")
                    pdf.set_font("Helvetica", "B", 6)
                    pdf.set_text_color(255, 255, 255)
                    pdf.set_xy(x + 1, name_y + 1)
                    pdf.cell(img_w - 2, label_h - 2, card.name[:28], align="C")

                    # ── Tag pills ─────────────────────────────────────────
                    pill_y = name_y + label_h
                    pill_x = x
                    visible_tags = card.tags[:3]
                    if visible_tags:
                        pill_slot_w = img_w / max(len(visible_tags), 1)
                        for ti, tg in enumerate(visible_tags):
                            tr, tg_g, tg_b = _hex_to_rgb(tg.color)
                            pdf.set_fill_color(tr, tg_g, tg_b)
                            px = pill_x + ti * pill_slot_w
                            pdf.rect(px, pill_y, pill_slot_w - 0.5, pill_h, style="F")
                            pdf.set_font("Helvetica", "", 4.5)
                            pdf.set_text_color(20, 20, 20)
                            pdf.set_xy(px, pill_y + 0.5)
                            pdf.cell(pill_slot_w - 0.5, pill_h - 1, tg.name[:10], align="C")

                else:
                    # ── Empty slot ────────────────────────────────────────
                    pdf.set_fill_color(30, 30, 40)
                    pdf.rect(x, y, img_w, img_h, style="F")
                    pdf.set_draw_color(60, 60, 80)
                    pdf.rect(x, y, img_w, img_h, style="D")
                    pdf.set_font("Helvetica", "", 7)
                    pdf.set_text_color(80, 80, 100)
                    pdf.set_xy(x, y + img_h / 2 - 3)
                    pdf.cell(img_w, 6, f"Slot {abs_slot + 1}", align="C")

        # ── Footer ───────────────────────────────────────────────────────────
        footer_y = PAGE_H - MARGIN - FOOTER_H
        pdf.set_fill_color(30, 30, 40)
        pdf.rect(MARGIN, footer_y, avail_w, FOOTER_H, style="F")
        pdf.set_font("Helvetica", "", 7)
        pdf.set_text_color(120, 120, 150)
        pdf.set_xy(MARGIN, footer_y + 1.5)
        pdf.cell(avail_w, FOOTER_H - 3, f"{total_cards} cards  ·  {pocket_label}", align="C")

    # Build output
    pdf_bytes = bytes(pdf.output())
    safe_name = binder.name.replace(" ", "_").replace("/", "-")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.pdf"'},
    )