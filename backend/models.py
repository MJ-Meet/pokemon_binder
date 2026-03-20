from sqlalchemy import (
    Column, Integer, String, LargeBinary, ForeignKey,
    DateTime, CheckConstraint, UniqueConstraint, Table, func,
)
from sqlalchemy.orm import relationship
from database import Base


# ── Association table ────────────────────────────────────────────────────────
card_tags = Table(
    "card_tags",
    Base.metadata,
    Column("card_id", Integer, ForeignKey("cards.id",  ondelete="CASCADE"), primary_key=True),
    Column("tag_id",  Integer, ForeignKey("tags.id",   ondelete="CASCADE"), primary_key=True),
)


# ── Binder ───────────────────────────────────────────────────────────────────
class Binder(Base):
    __tablename__ = "binders"
    __table_args__ = (
        CheckConstraint("grid_size BETWEEN 2 AND 4", name="ck_binders_grid_size"),
        CheckConstraint("pages BETWEEN 1 AND 50",    name="ck_binders_pages"),
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

    id         = Column(Integer, primary_key=True, index=True)
    binder_id  = Column(Integer, ForeignKey("binders.id", ondelete="CASCADE"), nullable=False, index=True)
    name       = Column(String(120), nullable=False)
    slot       = Column(Integer, nullable=False)
    card_type  = Column(String(20), nullable=False)
    image_data = Column(LargeBinary, nullable=False)
    image_mime = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    binder = relationship("Binder", back_populates="cards")
    tags   = relationship("Tag", secondary=card_tags, back_populates="cards")


# ── Tag ──────────────────────────────────────────────────────────────────────
class Tag(Base):
    __tablename__ = "tags"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(50), nullable=False, unique=True)
    color      = Column(String(20), nullable=False, default="#ffcb05")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    cards = relationship("Card", secondary=card_tags, back_populates="tags")