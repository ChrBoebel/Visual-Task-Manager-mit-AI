from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import uuid

class List(Base):
    __tablename__ = "lists"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    board_id = Column(String, ForeignKey("boards.id"), nullable=False)
    title = Column(String, nullable=False)
    order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    board = relationship("Board", back_populates="lists")
    cards = relationship("Card", back_populates="list", cascade="all, delete-orphan", order_by="Card.order")
