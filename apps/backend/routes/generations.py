from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models import Generation, GenerationCreate, GenerationRead

router = APIRouter(prefix="/api/generations", tags=["generations"])


@router.post("/", response_model=GenerationRead)
def save_generation(data: GenerationCreate, session: Session = Depends(get_session)):
    gen = Generation.model_validate(data)
    session.add(gen)
    session.commit()
    session.refresh(gen)
    return gen


@router.get("/", response_model=list[GenerationRead])
def list_generations(session: Session = Depends(get_session)):
    return session.exec(
        select(Generation).order_by(Generation.generation_number)
    ).all()


@router.get("/best", response_model=GenerationRead)
def get_best(session: Session = Depends(get_session)):
    result = session.exec(
        select(Generation).order_by(Generation.best_fitness.desc()).limit(1)
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="No generations saved yet")
    return result


@router.get("/{gen_id}", response_model=GenerationRead)
def get_generation(gen_id: int, session: Session = Depends(get_session)):
    gen = session.get(Generation, gen_id)
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")
    return gen
