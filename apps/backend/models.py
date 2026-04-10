from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class GenerationBase(SQLModel):
    generation_number: int
    population_size: int
    best_fitness: float
    avg_fitness: float
    mutation_rate: float
    best_brain_weights: str  # JSON sérialisé des poids du meilleur réseau
    checkpoints_passed: int
    frames_survived: int


class Generation(GenerationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GenerationCreate(GenerationBase):
    pass


class GenerationRead(GenerationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
