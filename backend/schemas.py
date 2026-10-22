from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


ALLOWED_RARITIES = [
    "Common", "Uncommon", "Rare", "Super Rare", "Baby Shiny", "Rare Shiny", 
    "Ilusration Rare(IR)", "Special Art Rare (SAR)", "Special Ilustration Art Rare", "Gold"
]


# ── Binder ───────────────────────────────────────────────────────────────────
class BinderCreate(BaseModel):
    name:      str = Field(..., min_length=1, max_length=120)
    grid_size: int = Field(default=3, ge=2, le=4)
    pages:     int = Field(default=10, ge=1, le=200)
    color:     str = Field(default="#e63946", pattern=r"^#[0-9a-fA-F]{6}$")

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class BinderOut(BaseModel):
    id:        int
    name:      str
    grid_size: int
    pages:     int
    color:     str
    created_at: datetime
    card_count: Optional[int] = 0

    model_config = {"from_attributes": True}


# ── Card ─────────────────────────────────────────────────────────────────────
class CardOut(BaseModel):
    id:              int
    binder_id:       int
    name:            Optional[str] = None
    slot:            int
    card_type:       Optional[str] = None
    image_mime:      str
    created_at:      datetime
    # New V2 fields
    favorite:        bool = False
    rarity:          Optional[str] = None
    notes:           Optional[str] = None
    set_name:        Optional[str] = None
    set_total_cards: Optional[int] = None
    card_number:     Optional[int] = None
    date_updated:    Optional[datetime] = None

    model_config = {"from_attributes": True}


class BinderDetail(BinderOut):
    cards: List[CardOut] = []


class CardMove(BaseModel):
    slot: int = Field(..., ge=0)


class CardUpdate(BaseModel):
    """PATCH payload — all fields optional."""
    name:            Optional[str] = Field(None, min_length=1, max_length=120)
    card_type:       Optional[str] = None
    favorite:        Optional[bool] = None
    rarity:          Optional[str] = None
    notes:           Optional[str] = None
    set_name:        Optional[str] = Field(None, max_length=120)
    set_total_cards: Optional[int] = Field(None, ge=1)
    card_number:     Optional[int] = Field(None, ge=1)


# ── Sets ─────────────────────────────────────────────────────────────────────
class CardSetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    total_cards: int = Field(..., ge=1)

class CardSetOut(BaseModel):
    id: int
    name: str
    total_cards: int
    model_config = {"from_attributes": True}


class SetStats(BaseModel):
    set_id:          int
    set_name:        str
    set_total_cards: Optional[int]
    collected:       int
    missing:         int
    completion_pct:  float
    cards:           List[CardOut] = []

    model_config = {"from_attributes": True}


# ── Collection Stats ─────────────────────────────────────────────────────────
class GrowthPoint(BaseModel):
    month: str
    count: int


class CollectionStats(BaseModel):
    total_cards:     int
    total_binders:   int
    total_pages:     int
    total_slots:     int
    filled_slots:    int
    completion_pct:  float
    favorites_count: int
    by_type:         dict
    by_rarity:       dict
    most_rare_card:  Optional[CardOut] = None
    recently_added:  List[CardOut] = []
    growth_by_month: List[GrowthPoint] = []