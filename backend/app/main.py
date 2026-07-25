from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analyses, health


def create_app() -> FastAPI:
    app = FastAPI(title="FilmPersona API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(analyses.router, prefix="/api")
    return app


app = create_app()
