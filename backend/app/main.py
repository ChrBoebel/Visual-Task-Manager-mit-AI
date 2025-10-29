from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api import boards, chat

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(title="Kanban Board API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(boards.router, prefix="/api", tags=["boards"])
app.include_router(chat.router, prefix="/api", tags=["chat"])

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Kanban Board API", "version": "1.0.0"}

# Health check
@app.get("/health")
async def health():
    return {"status": "healthy"}
