from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from database import create_db, get_session
from models import Generation
from routes import generations, health, stats

app = FastAPI(title="AI Racing API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db()


# Include routers
app.include_router(generations.router)
app.include_router(health.router)
app.include_router(stats.router)


@app.delete("/api/reset")
def reset_data(session: Session = Depends(get_session)):
    """Efface toutes les données de génération."""
    generations_list = session.exec(select(Generation)).all()
    for gen in generations_list:
        session.delete(gen)
    session.commit()
    return {"status": "ok", "deleted": len(generations_list)}
