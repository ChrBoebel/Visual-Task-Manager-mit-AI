from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List as ListType
from app.database import get_db
from app.models import Board, List, Card
from app.schemas import (
    Board as BoardSchema,
    BoardCreate,
    BoardUpdate,
    ListResponse,
    ListCreate,
    ListUpdate,
    Card as CardSchema,
    CardCreate,
    CardUpdate,
)

router = APIRouter()

# Board endpoints
@router.get("/boards", response_model=ListType[BoardSchema])
def get_boards(db: Session = Depends(get_db)):
    """Get all boards"""
    boards = db.query(Board).all()
    return boards

@router.get("/boards/{board_id}", response_model=BoardSchema)
def get_board(board_id: str, db: Session = Depends(get_db)):
    """Get a specific board with all lists and cards"""
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board

@router.post("/boards", response_model=BoardSchema, status_code=201)
def create_board(board: BoardCreate, db: Session = Depends(get_db)):
    """Create a new board"""
    db_board = Board(title=board.title)
    db.add(db_board)
    db.commit()
    db.refresh(db_board)
    return db_board

@router.put("/boards/{board_id}", response_model=BoardSchema)
def update_board(board_id: str, board: BoardUpdate, db: Session = Depends(get_db)):
    """Update a board"""
    db_board = db.query(Board).filter(Board.id == board_id).first()
    if not db_board:
        raise HTTPException(status_code=404, detail="Board not found")

    if board.title is not None:
        db_board.title = board.title

    db.commit()
    db.refresh(db_board)
    return db_board

@router.delete("/boards/{board_id}", status_code=204)
def delete_board(board_id: str, db: Session = Depends(get_db)):
    """Delete a board"""
    db_board = db.query(Board).filter(Board.id == board_id).first()
    if not db_board:
        raise HTTPException(status_code=404, detail="Board not found")

    db.delete(db_board)
    db.commit()
    return None

# List endpoints
@router.post("/lists", response_model=ListResponse, status_code=201)
def create_list(list_data: ListCreate, db: Session = Depends(get_db)):
    """Create a new list"""
    # Verify board exists
    board = db.query(Board).filter(Board.id == list_data.board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    db_list = List(
        board_id=list_data.board_id,
        title=list_data.title,
        order=list_data.order
    )
    db.add(db_list)
    db.commit()
    db.refresh(db_list)
    return db_list

@router.put("/lists/{list_id}", response_model=ListResponse)
def update_list(list_id: str, list_data: ListUpdate, db: Session = Depends(get_db)):
    """Update a list"""
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")

    if list_data.title is not None:
        db_list.title = list_data.title
    if list_data.order is not None:
        db_list.order = list_data.order

    db.commit()
    db.refresh(db_list)
    return db_list

@router.delete("/lists/{list_id}", status_code=204)
def delete_list(list_id: str, db: Session = Depends(get_db)):
    """Delete a list"""
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")

    db.delete(db_list)
    db.commit()
    return None

# Card endpoints
@router.post("/cards", response_model=CardSchema, status_code=201)
def create_card(card: CardCreate, db: Session = Depends(get_db)):
    """Create a new card"""
    # Verify list exists
    list_obj = db.query(List).filter(List.id == card.list_id).first()
    if not list_obj:
        raise HTTPException(status_code=404, detail="List not found")

    db_card = Card(
        list_id=card.list_id,
        title=card.title,
        description=card.description,
        order=card.order,
        labels=card.labels,
        due_date=card.due_date,
    )
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

@router.put("/cards/{card_id}", response_model=CardSchema)
def update_card(card_id: str, card: CardUpdate, db: Session = Depends(get_db)):
    """Update a card"""
    db_card = db.query(Card).filter(Card.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Card not found")

    if card.title is not None:
        db_card.title = card.title
    if card.description is not None:
        db_card.description = card.description
    if card.labels is not None:
        db_card.labels = card.labels
    if card.due_date is not None:
        db_card.due_date = card.due_date
    if card.list_id is not None:
        # Verify new list exists
        list_obj = db.query(List).filter(List.id == card.list_id).first()
        if not list_obj:
            raise HTTPException(status_code=404, detail="List not found")
        db_card.list_id = card.list_id
    if card.order is not None:
        db_card.order = card.order

    db.commit()
    db.refresh(db_card)
    return db_card

@router.delete("/cards/{card_id}", status_code=204)
def delete_card(card_id: str, db: Session = Depends(get_db)):
    """Delete a card"""
    db_card = db.query(Card).filter(Card.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Card not found")

    db.delete(db_card)
    db.commit()
    return None
