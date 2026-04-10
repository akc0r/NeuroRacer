# Backend Documentation

The backend is a lightweight persistence layer designed to store simulation results and historical performance data.

## Technology Stack
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **ORM**: [SQLModel](https://sqlmodel.tiangolo.com/) (SQLAlchemy + Pydantic)
- **Database**: SQLite (local file)
- **Server**: Uvicorn

## Data Model

The primary entity is the `Generation`, which captures the state of the best individual in a specific training cycle.

```python
class Generation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    generation_number: int     # Numeric index of the generation
    population_size: int       # Total cars in this batch
    best_fitness: float       # Highest fitness score reached
    avg_fitness: float        # Average fitness across population
    mutation_rate: float      # Rate used for this generation
    best_brain_weights: str    # JSON string containing weights/biases
    checkpoints_passed: int    # Progress quantification
    frames_survived: int       # Lifespan quantification
    created_at: datetime       # Timestamp
```

## API Endpoints

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server heartbeat |
| `POST` | `/api/generations` | Save new generation data |
| `GET` | `/api/generations` | List all historical data |
| `GET` | `/api/generations/best` | Retrieve the highest score ever |
| `DELETE` | `/api/reset` | Clear all database records |

## Infrastructure
The backend is containerized via `Dockerfile`. In production, it uses a volume to persist the SQLite database (`ai_racing.db`).
