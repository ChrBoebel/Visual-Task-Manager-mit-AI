from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class CardBase(BaseModel):
    title: str
    description: Optional[str] = None
    labels: Optional[List[str]] = None
    due_date: Optional[datetime] = None

class CardCreate(CardBase):
    list_id: str
    order: Optional[int] = 0

class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    labels: Optional[List[str]] = None
    due_date: Optional[datetime] = None
    list_id: Optional[str] = None
    order: Optional[int] = None

class Card(CardBase):
    id: str
    list_id: str
    order: int
    created_at: datetime

    class Config:
        from_attributes = True

class ListBase(BaseModel):
    title: str

class ListCreate(ListBase):
    board_id: str
    order: Optional[int] = 0

class ListUpdate(BaseModel):
    title: Optional[str] = None
    order: Optional[int] = None

class ListResponse(ListBase):
    id: str
    board_id: str
    order: int
    cards: List[Card] = []
    created_at: datetime

    class Config:
        from_attributes = True

class BoardBase(BaseModel):
    title: str

class BoardCreate(BoardBase):
    pass

class BoardUpdate(BaseModel):
    title: Optional[str] = None

class Board(BoardBase):
    id: str
    lists: List[ListResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True
