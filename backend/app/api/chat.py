from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict
from app.database import get_db
from app.services.chat import chat_service
from app.models import Board


router = APIRouter()


class ChatMessageRequest(BaseModel):
    board_id: str
    message: str


class ChatMessageResponse(BaseModel):
    response: str
    actions_taken: List[str]


class ChatHistoryItem(BaseModel):
    role: str
    content: str


@router.post("/chat/message", response_model=ChatMessageResponse)
def send_chat_message(
    request: ChatMessageRequest,
    db: Session = Depends(get_db)
):
    """Send a message to the AI assistant for a specific board."""
    # Verify board exists
    board = db.query(Board).filter(Board.id == request.board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    result = chat_service.send_message(db, request.board_id, request.message)
    return ChatMessageResponse(**result)


@router.get("/chat/history/{board_id}", response_model=List[ChatHistoryItem])
def get_chat_history(board_id: str, db: Session = Depends(get_db)):
    """Get chat history for a board."""
    # Verify board exists
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    history = chat_service.get_history(board_id)
    return [ChatHistoryItem(**item) for item in history]


@router.delete("/chat/history/{board_id}", status_code=204)
def clear_chat_history(board_id: str, db: Session = Depends(get_db)):
    """Clear chat history for a board."""
    # Verify board exists
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    chat_service.clear_history(board_id)
    return None
