import io
from fpdf import FPDF
from PIL import Image as PILImage
from datetime import datetime, timezone

from fastapi import (
    FastAPI, Depends, HTTPException, UploadFile, File, Form, Response
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, text as sa_text
from typing import List, Optional

from database import engine, get_db
import models
import schemas

# ── Startup: create tables (idempotent) ───────────────────────────────────────
models.Base.metadata.create_all(bind=engine)

# ── Startup: safe column migration (V2) ───────────────────────────────────────
_V2_MIGRATIONS = [
    "ALTER TABLE cards ADD COLUMN IF NOT EXISTS favorite        BOOLEAN      NOT NULL DEFAULT FALSE",
    "ALTER TABLE cards ADD COLUMN IF NOT EXISTS rarity          VARCHAR(30)",
    "ALTER TABLE cards ADD COLUMN IF NOT EXISTS notes           TEXT",
    "ALTER TABLE cards ADD COLUMN IF NOT EXISTS set_name        VARCHAR(120)",
    "ALTER TABLE cards ADD COLUMN IF NOT EXISTS set_total_cards INTEGER",
    "ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_number     INTEGER",
    "ALTER TABLE cards ADD COLUMN IF NOT EXISTS date_updated    TIMESTAMPTZ",
]

def _run_v2_migrations():
    with engine.connect() as conn:
        for stmt in _V2_MIGRATIONS:
            try:
                conn.execute(sa_text(stmt))
            except Exception:
                pass
        conn.commit()

_run_v2_migrations()


# ── Startup: Explicit Set Management migration (V3) ───────────────────────────
_V3_MIGRATIONS = [
    "CREATE TABLE IF NOT EXISTS card_sets (id INTEGER PRIMARY KEY, name VARCHAR(120) UNIQUE NOT NULL, total_cards INTEGER NOT NULL)",
    "INSERT INTO card_sets (name, total_cards) SELECT set_name, MAX(set_total_cards) FROM cards WHERE set_name IS NOT NULL AND set_total_cards IS NOT NULL GROUP BY set_name ON CONFLICT(name) DO NOTHING"
]

def _run_v3_migrations():
    with engine.connect() as conn:
        for stmt in _V3_MIGRATIONS:
            try:
                conn.execute(sa_text(stmt))
            except Exception:
                pass
        conn.commit()

_run_v3_migrations()

app = FastAPI(title="Pokémon Card Binder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_MIME  = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {"Fire", "Water", "Grass", "Fighting", "Steel", "Electric", "Dark", "Psychic", "Dragon", "Colorless"}
ALLOWED_RARITIES = {"Common", "Uncommon", "Rare", "Super Rare", "Baby Shiny", "Rare Shiny", "Ilusration Rare(IR)", "Special Art Rare (SAR)", "Special Ilustration Art Rare", "Gold"}
RARITY_RANK = ["Gold", "Special Ilustration Art Rare", "Special Art Rare (SAR)", "Ilusration Rare(IR)", "Rare Shiny", "Baby Shiny", "Super Rare", "Rare", "Uncommon", "Common"]


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
    binders = (
        db.query(models.Binder)
        .order_by(models.Binder.created_at.desc())
        .all()
    )
    for b in binders:
        b.card_count = len(b.cards)
    return binders


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
# Search (binder-scoped)
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/binders/{binder_id}/cards/search", response_model=List[schemas.CardOut])
def search_cards(
    binder_id: int,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    binder = db.query(models.Binder).filter(models.Binder.id == binder_id).first()
    if not binder:
        raise HTTPException(status_code=404, detail="Binder not found")

    query = db.query(models.Card).filter(models.Card.binder_id == binder_id)

    if q:
        query = query.filter(models.Card.name.ilike(f"%{q}%"))

    return query.order_by(models.Card.slot).all()


# ──────────────────────────────────────────────────────────────────────────────
# Card routes
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/binders/{binder_id}/cards", response_model=schemas.CardOut, status_code=201)
async def upload_card(
    binder_id: int,
    name: str  = Form(...),
    slot: int  = Form(...),
    card_type: str = Form(...),
    file: UploadFile = File(...),
    rarity: str = Form(default=""),
    set_name: str = Form(default=""),
    set_total_cards: Optional[int] = Form(default=None),
    card_number: Optional[int] = Form(default=None),
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

    # 1.6. Validate Rarity (if provided)
    rarity_val = rarity.strip() if rarity.strip() else None
    if rarity_val and rarity_val not in ALLOWED_RARITIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid rarity '{rarity_val}'. Allowed: {ALLOWED_RARITIES}"
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

    if card_number is not None and set_total_cards is not None:
        if card_number > set_total_cards:
            raise HTTPException(status_code=400, detail="Card number cannot exceed total cards in set")

    # 5. Create card
    card = models.Card(
        binder_id=binder_id,
        name=name,
        slot=slot,
        card_type=card_type,
        image_data=image_bytes,
        image_mime=content_type,
        rarity=rarity_val,
        set_name=set_name.strip() if set_name.strip() else None,
        set_total_cards=set_total_cards,
        card_number=card_number,
    )

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


@app.patch("/cards/{card_id}", response_model=schemas.CardOut)
def update_card(card_id: int, payload: schemas.CardUpdate, db: Session = Depends(get_db)):
    """Update card metadata (name, type, rarity, notes, set, favorite)."""
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    update_data = payload.model_dump(exclude_unset=True)

    # Validate type if provided
    if "card_type" in update_data and update_data["card_type"] not in ALLOWED_TYPES:
        raise HTTPException(400, detail=f"Invalid card type '{update_data['card_type']}'")

    # Validate rarity if provided
    if "rarity" in update_data and update_data["rarity"] and update_data["rarity"] not in ALLOWED_RARITIES:
        raise HTTPException(400, detail=f"Invalid rarity '{update_data['rarity']}'")

    new_card_number = update_data.get("card_number", card.card_number)
    new_set_total = update_data.get("set_total_cards", card.set_total_cards)
    if new_card_number is not None and new_set_total is not None:
        if new_card_number > new_set_total:
            raise HTTPException(status_code=400, detail="Card number cannot exceed total cards in set")

    for key, value in update_data.items():
        setattr(card, key, value)

    card.date_updated = datetime.now(timezone.utc)

    db.commit()
    db.refresh(card)
    return card


@app.put("/cards/{card_id}/favorite", response_model=schemas.CardOut)
def toggle_favorite(card_id: int, db: Session = Depends(get_db)):
    """Toggle the favorite flag on a card."""
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card.favorite = not card.favorite
    card.date_updated = datetime.now(timezone.utc)
    db.commit()
    db.refresh(card)
    return card


# ──────────────────────────────────────────────────────────────────────────────
# Global card search (cross-binder)
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/cards", response_model=List[schemas.CardOut])
def search_all_cards(
    q: Optional[str] = None,
    card_type: Optional[str] = None,
    rarity: Optional[str] = None,
    set_name: Optional[str] = None,
    favorite: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(models.Card)
    if q:
        query = query.filter(models.Card.name.ilike(f"%{q}%"))
    if card_type:
        query = query.filter(models.Card.card_type == card_type)
    if rarity:
        query = query.filter(models.Card.rarity == rarity)
    if set_name:
        query = query.filter(models.Card.set_name.ilike(f"%{set_name}%"))
    if favorite is not None:
        query = query.filter(models.Card.favorite == favorite)
    return query.order_by(models.Card.created_at.desc()).offset(offset).limit(limit).all()


# ──────────────────────────────────────────────────────────────────────────────
# Favorites
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/favorites", response_model=List[schemas.CardOut])
def get_favorites(db: Session = Depends(get_db)):
    return (
        db.query(models.Card)
        .filter(models.Card.favorite == True)
        .order_by(models.Card.created_at.desc())
        .all()
    )


# ──────────────────────────────────────────────────────────────────────────────
# Set Completion Tracker
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/sets", response_model=List[schemas.SetStats])
def get_sets(db: Session = Depends(get_db)):
    """Return per-set completion stats from explicitly managed CardSets."""
    card_sets = db.query(models.CardSet).all()
    results = []
    
    for cset in card_sets:
        cards = (
            db.query(models.Card)
            .filter(models.Card.set_name == cset.name)
            .order_by(models.Card.card_number.nulls_last(), models.Card.id)
            .all()
        )
        collected = len(cards)
        missing = max(0, cset.total_cards - collected)
        pct = round((collected / cset.total_cards) * 100, 1) if cset.total_cards > 0 else 0.0
        
        results.append(schemas.SetStats(
            set_id=cset.id,
            set_name=cset.name,
            set_total_cards=cset.total_cards,
            collected=collected,
            missing=missing,
            completion_pct=pct,
            cards=cards,
        ))
        
    return sorted(results, key=lambda x: x.completion_pct, reverse=True)


@app.get("/card-sets", response_model=List[schemas.CardSetOut])
def list_card_sets(db: Session = Depends(get_db)):
    return db.query(models.CardSet).order_by(models.CardSet.name).all()


@app.post("/card-sets", response_model=schemas.CardSetOut, status_code=201)
def create_card_set(payload: schemas.CardSetCreate, db: Session = Depends(get_db)):
    existing = db.query(models.CardSet).filter(models.CardSet.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Set already exists")
    new_set = models.CardSet(name=payload.name, total_cards=payload.total_cards)
    db.add(new_set)
    db.commit()
    db.refresh(new_set)
    return new_set


@app.delete("/card-sets/{set_id}", status_code=204)
def delete_card_set(set_id: int, db: Session = Depends(get_db)):
    """Delete a card set. Cards referencing this set will have their set_name cleared."""
    card_set = db.query(models.CardSet).filter(models.CardSet.id == set_id).first()
    if not card_set:
        raise HTTPException(status_code=404, detail="Card set not found")
    # Clear set_name on cards that reference this set
    db.query(models.Card).filter(models.Card.set_name == card_set.name).update(
        {models.Card.set_name: None, models.Card.set_total_cards: None},
        synchronize_session="fetch",
    )
    db.delete(card_set)
    db.commit()
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Collection Statistics Dashboard
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/stats", response_model=schemas.CollectionStats)
def get_stats(db: Session = Depends(get_db)):
    total_cards   = db.query(models.Card).count()
    total_binders = db.query(models.Binder).count()

    # Sum of pages and total slot capacity
    pages_result = db.query(func.sum(models.Binder.pages)).scalar()
    total_pages  = int(pages_result or 0)

    # Total slots capacity = sum(pages * grid_size^2) per binder
    binders = db.query(models.Binder).all()
    total_slots = sum(b.pages * b.grid_size * b.grid_size for b in binders)
    completion_pct = round((total_cards / total_slots) * 100, 1) if total_slots > 0 else 0.0

    favorites_count = db.query(models.Card).filter(models.Card.favorite == True).count()

    # By type
    type_rows = (
        db.query(models.Card.card_type, func.count(models.Card.id))
        .group_by(models.Card.card_type)
        .all()
    )
    by_type = {t: c for t, c in type_rows}

    # By rarity
    rarity_rows = (
        db.query(models.Card.rarity, func.count(models.Card.id))
        .filter(models.Card.rarity.isnot(None))
        .group_by(models.Card.rarity)
        .all()
    )
    by_rarity = {r: c for r, c in rarity_rows}

    # Most rare card (by rarity rank)
    most_rare = None
    for rarity in RARITY_RANK:
        card = db.query(models.Card).filter(models.Card.rarity == rarity).first()
        if card:
            most_rare = card
            break

    # Recently added (last 10)
    recently_added = (
        db.query(models.Card)
        .order_by(models.Card.created_at.desc())
        .limit(10)
        .all()
    )

    # Growth by month — group by month of created_at
    growth_rows = (
        db.query(
            func.date_trunc("month", models.Card.created_at).label("month"),
            func.count(models.Card.id).label("count"),
        )
        .group_by("month")
        .order_by("month")
        .all()
    )
    growth_by_month = [
        schemas.GrowthPoint(month=str(g.month)[:7], count=g.count)
        for g in growth_rows
    ]

    return schemas.CollectionStats(
        total_cards=total_cards,
        total_binders=total_binders,
        total_pages=total_pages,
        total_slots=total_slots,
        filled_slots=total_cards,
        completion_pct=completion_pct,
        favorites_count=favorites_count,
        by_type=by_type,
        by_rarity=by_rarity,
        most_rare_card=most_rare,
        recently_added=recently_added,
        growth_by_month=growth_by_month,
    )


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
    def _safe(s):
        return s.encode("latin-1", "replace").decode("latin-1") if s else ""

    binder = db.query(models.Binder).filter(models.Binder.id == binder_id).first()
    if not binder:
        raise HTTPException(status_code=404, detail="Binder not found")

    cards = sorted(binder.cards, key=lambda c: c.slot)
    slot_map = {c.slot: c for c in cards}

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
    label_h    = 6

    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(False)

    total_pages = binder.pages
    total_cards = len(cards)
    pocket_label = {2: "4-Pocket", 3: "9-Pocket", 4: "16-Pocket"}.get(gs, f"{gs*gs}-Pocket")

    for page_idx in range(total_pages):
        pdf.add_page()
        r, g, b = binder_rgb
        pdf.set_fill_color(r, g, b)
        pdf.rect(0, 0, PAGE_W, HEADER_H + 2, style="F")
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(MARGIN, 3)
        pdf.cell(avail_w * 0.7, 8, _safe(binder.name[:60]), align="L")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_xy(MARGIN + avail_w * 0.7, 3)
        pdf.cell(avail_w * 0.3, 8, f"Page {page_idx + 1} / {total_pages}", align="R")

        grid_top = MARGIN + HEADER_H
        for row in range(gs):
            for col in range(gs):
                abs_slot = page_idx * gs * gs + row * gs + col
                x = MARGIN + col * cell_w + GAP / 2
                y = grid_top + row * cell_h + GAP / 2
                card = slot_map.get(abs_slot)

                if card:
                    rendered = False
                    try:
                        img_bytes = bytes(card.image_data)
                        pil_img = PILImage.open(io.BytesIO(img_bytes)).convert("RGB")
                        buf = io.BytesIO()
                        pil_img.save(buf, format="PNG")
                        buf.seek(0)
                        pdf.image(buf, x=x, y=y, w=img_w, h=img_h - label_h)
                        rendered = True
                    except Exception:
                        pass

                    if not rendered:
                        pdf.set_fill_color(60, 60, 70)
                        pdf.rect(x, y, img_w, img_h - label_h, style="F")

                    name_y = y + img_h - label_h
                    pdf.set_fill_color(15, 15, 20)
                    pdf.rect(x, name_y, img_w, label_h, style="F")
                    pdf.set_font("Helvetica", "B", 6)
                    pdf.set_text_color(255, 255, 255)
                    pdf.set_xy(x + 1, name_y + 1)
                    pdf.cell(img_w - 2, label_h - 2, _safe(card.name[:28]), align="C")

                else:
                    pdf.set_fill_color(30, 30, 40)
                    pdf.rect(x, y, img_w, img_h, style="F")
                    pdf.set_draw_color(60, 60, 80)
                    pdf.rect(x, y, img_w, img_h, style="D")
                    pdf.set_font("Helvetica", "", 7)
                    pdf.set_text_color(80, 80, 100)
                    pdf.set_xy(x, y + img_h / 2 - 3)
                    pdf.cell(img_w, 6, f"Slot {abs_slot + 1}", align="C")

        footer_y = PAGE_H - MARGIN - FOOTER_H
        pdf.set_fill_color(30, 30, 40)
        pdf.rect(MARGIN, footer_y, avail_w, FOOTER_H, style="F")
        pdf.set_font("Helvetica", "", 7)
        pdf.set_text_color(120, 120, 150)
        pdf.set_xy(MARGIN, footer_y + 1.5)
        pdf.cell(avail_w, FOOTER_H - 3, f"{total_cards} cards  ·  {pocket_label}", align="C")

    pdf_bytes = bytes(pdf.output())
    safe_name = _safe(binder.name).replace(" ", "_").replace("/", "-")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.pdf"'},
    )