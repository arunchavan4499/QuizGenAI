from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth_api, health_api, leaderboard_api, quiz_api, stats_api

origins = ["*"]

app = FastAPI(title="Hire4thon Backend API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_api.router, tags=["health"])
app.include_router(auth_api.router, prefix="/auth", tags=["auth"])
app.include_router(quiz_api.router, prefix="/quiz", tags=["quiz"])
app.include_router(leaderboard_api.router, prefix="/leaderboard", tags=["leaderboard"])
app.include_router(stats_api.router, prefix="/api", tags=["stats"])


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Hire4thon backend is running"}

