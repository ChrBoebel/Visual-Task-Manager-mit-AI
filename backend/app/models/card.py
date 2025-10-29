from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import uuid

class Card(Base):
    __tablename__ = "cards"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    list_id = Column(String, ForeignKey("lists.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    order = Column(Integer, nullable=False, default=0)
    labels = Column(JSON, nullable=True)  # Store as JSON array of strings
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    list = relationship("List", back_populates="cards")
