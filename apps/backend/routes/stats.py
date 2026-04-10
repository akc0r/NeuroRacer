from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from database import get_session
from models import Generation

router = APIRouter(prefix="/api/stats", tags=["stats"])

@router.get("/")
def get_stats(session: Session = Depends(get_session)):
    # Total generations trained
    total_gens = session.exec(select(func.count(Generation.id))).first()
    
    # Best fitness ever achieved
    best_fitness = session.exec(select(func.max(Generation.best_fitness))).first() or 0.0
    
    # Average fitness across all
    avg_fitness_all = session.exec(select(func.avg(Generation.avg_fitness))).first() or 0.0
    
    # Get the latest generation to compare
    latest_gen = session.exec(select(Generation).order_by(Generation.generation_number.desc())).first()
    latest_best = latest_gen.best_fitness if latest_gen else 0.0

    return {
        "total_generations_trained": total_gens,
        "best_fitness_ever": best_fitness,
        "average_fitness_all_time": avg_fitness_all,
        "latest_best_fitness": latest_best
    }
