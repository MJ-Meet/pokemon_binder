from datetime import datetime
from typing import List
from pydantic import BaseModel, Field, field_validator


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

    model_config = {"from_attributes": True}


# ── Tag ──────────────────────────────────────────────────────────────────────
class TagCreate(BaseModel):
    name:  str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#ffcb05", pattern=r"^#[0-9a-fA-F]{6}$")

    @field_validator("name")
    @classmethod
    def normalise_name(cls, v: str) -> str:
        return v.strip().lower()


class TagOut(BaseModel):
    id:    int
    name:  str
    color: str

    model_config = {"from_attributes": True}


# ── Card ─────────────────────────────────────────────────────────────────────
class CardOut(BaseModel):
    id:         int
    binder_id:  int
    name:       str
    slot:       int
    card_type:  str
    image_mime: str
    created_at: datetime
    tags:       List[TagOut] = []

    model_config = {"from_attributes": True}


class BinderDetail(BinderOut):
    cards: List[CardOut] = []


class CardMove(BaseModel):
    slot: int = Field(..., ge=0)