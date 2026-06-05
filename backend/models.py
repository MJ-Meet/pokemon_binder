from sqlalchemy import (
    Column, Integer, String, LargeBinary, ForeignKey,
    DateTime, CheckConstraint, UniqueConstraint, func,
    Boolean, Text,
)
from sqlalchemy.orm import relationship
from database import Base


# ── Binder ───────────────────────────────────────────────────────────────────
class Binder(Base):
    __tablename__ = "binders"
    __table_args__ = (
        CheckConstraint("grid_size BETWEEN 2 AND 4", name="ck_binders_grid_size"),
        CheckConstraint("pages BETWEEN 1 AND 200",    name="ck_binders_pages"),
    )

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(120), nullable=False)
    grid_size  = Column(Integer, nullable=False, default=3)
    pages      = Column(Integer, nullable=False, default=10)
    color      = Column(String(20), nullable=False, default="#e63946")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    cards = relationship("Card", back_populates="binder", cascade="all, delete-orphan")


# ── Card ─────────────────────────────────────────────────────────────────────
class Card(Base):
    __tablename__ = "cards"
    __table_args__ = (
        UniqueConstraint("binder_id", "slot", name="uq_cards_binder_slot"),
    )

    id              = Column(Integer, primary_key=True, index=True)
    binder_id       = Column(Integer, ForeignKey("binders.id", ondelete="CASCADE"), nullable=False, index=True)
    name            = Column(String(120), nullable=False)
    slot            = Column(Integer, nullable=False)
    card_type       = Column(String(20), nullable=False)
    image_data      = Column(LargeBinary, nullable=False)
    image_mime      = Column(String(50), nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # ── New columns (Migration V2) ─────────────────────────────────────────────
    favorite        = Column(Boolean, nullable=False, default=False, server_default="false")
    rarity          = Column(String(30), nullable=True)
    notes           = Column(Text, nullable=True)
    set_name        = Column(String(120), nullable=True)
    set_total_cards = Column(Integer, nullable=True)
    card_number     = Column(Integer, nullable=True)
    date_updated    = Column(DateTime(timezone=True), nullable=True)

    binder = relationship("Binder", back_populates="cards")


# ── CardSet ──────────────────────────────────────────────────────────────────
class CardSet(Base):
    __tablename__ = "card_sets"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(120), unique=True, nullable=False)
    total_cards = Column(Integer, nullable=False)