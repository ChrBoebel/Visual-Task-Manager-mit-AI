from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import uuid

class Board(Base):
    __tablename__ = "boards"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lists = relationship("List", back_populates="board", cascade="all, delete-orphan", order_by="List.order")
