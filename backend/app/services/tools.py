from langchain_core.tools import tool
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.models import Board, List as BoardList, Card


def create_board_tools(db: Session, board_id: str):
    """Create LangChain tools for board operations.

    Args:
        db: Database session
        board_id: Board ID for context

    Returns:
        List of LangChain tools
    """

    @tool
    def create_card(
        list_id: str,
        title: str,
        description: Optional[str] = None,
        labels: Optional[str] = None,
        due_date: Optional[str] = None
    ) -> str:
        """Erstelle eine neue Karte in einer Liste.

        Args:
            list_id: Die ID der Liste, zu der die Karte hinzugefügt werden soll
            title: Kartentitel
            description: Optionale Kartenbeschreibung
            labels: Optionale kommagetrennte Liste von Labels
            due_date: Optionales Fälligkeitsdatum im Format YYYY-MM-DD
        """
        try:
            # Get the list and count existing cards
            lst = db.query(BoardList).filter(BoardList.id == list_id).first()
            if not lst:
                return f"Fehler: Liste mit ID {list_id} nicht gefunden"

            # Get max order
            max_order = db.query(Card).filter(Card.list_id == list_id).count()

            # Parse due_date if provided
            parsed_date = None
            if due_date:
                try:
                    parsed_date = datetime.strptime(due_date, "%Y-%m-%d")
                except ValueError:
                    return f"Fehler: Ungültiges Datumsformat. Nutze YYYY-MM-DD"

            # Parse labels
            label_list = None
            if labels:
                label_list = [label.strip() for label in labels.split(",")]

            card = Card(
                list_id=list_id,
                title=title,
                description=description,
                order=max_order,
                labels=label_list,
                due_date=parsed_date
            )
            db.add(card)
            db.commit()
            db.refresh(card)

            return f"Erfolgreich Karte '{title}' (ID: {card.id}) in Liste '{lst.title}' erstellt"
        except Exception as e:
            db.rollback()
            return f"Fehler beim Erstellen der Karte: {str(e)}"

    @tool
    def update_card(
        card_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        labels: Optional[str] = None,
        due_date: Optional[str] = None
    ) -> str:
        """Aktualisiere eine bestehende Karte.

        Args:
            card_id: Die ID der zu aktualisierenden Karte
            title: Optionaler neuer Titel
            description: Optionale neue Beschreibung
            labels: Optionale neue kommagetrennte Liste von Labels
            due_date: Optionales neues Fälligkeitsdatum im Format YYYY-MM-DD
        """
        try:
            card = db.query(Card).filter(Card.id == card_id).first()
            if not card:
                return f"Fehler: Karte mit ID {card_id} nicht gefunden"

            if title is not None:
                card.title = title
            if description is not None:
                card.description = description
            if labels is not None:
                card.labels = [label.strip() for label in labels.split(",")]
            if due_date is not None:
                try:
                    card.due_date = datetime.strptime(due_date, "%Y-%m-%d")
                except ValueError:
                    return f"Fehler: Ungültiges Datumsformat. Nutze YYYY-MM-DD"

            db.commit()
            return f"Erfolgreich Karte '{card.title}' (ID: {card_id}) aktualisiert"
        except Exception as e:
            db.rollback()
            return f"Fehler beim Aktualisieren der Karte: {str(e)}"

    @tool
    def delete_card(card_id: str) -> str:
        """Lösche eine Karte.

        Args:
            card_id: Die ID der zu löschenden Karte
        """
        try:
            card = db.query(Card).filter(Card.id == card_id).first()
            if not card:
                return f"Fehler: Karte mit ID {card_id} nicht gefunden"

            title = card.title
            db.delete(card)
            db.commit()
            return f"Erfolgreich Karte '{title}' gelöscht"
        except Exception as e:
            db.rollback()
            return f"Fehler beim Löschen der Karte: {str(e)}"

    @tool
    def move_card(card_id: str, target_list_id: str, order: Optional[int] = None) -> str:
        """Verschiebe eine Karte in eine andere Liste.

        Args:
            card_id: Die ID der zu verschiebenden Karte
            target_list_id: Die ID der Ziel-Liste
            order: Optionale Position in der Ziel-Liste (Standard: Ende)
        """
        try:
            card = db.query(Card).filter(Card.id == card_id).first()
            if not card:
                return f"Fehler: Karte mit ID {card_id} nicht gefunden"

            target_list = db.query(BoardList).filter(BoardList.id == target_list_id).first()
            if not target_list:
                return f"Fehler: Liste mit ID {target_list_id} nicht gefunden"

            old_list_title = card.list.title
            card.list_id = target_list_id

            if order is not None:
                card.order = order
            else:
                # Move to end
                max_order = db.query(Card).filter(Card.list_id == target_list_id).count()
                card.order = max_order

            db.commit()
            return f"Erfolgreich Karte '{card.title}' von '{old_list_title}' nach '{target_list.title}' verschoben"
        except Exception as e:
            db.rollback()
            return f"Fehler beim Verschieben der Karte: {str(e)}"

    @tool
    def create_list(title: str, order: Optional[int] = None) -> str:
        """Erstelle eine neue Liste auf dem Board.

        Args:
            title: Listen-Titel
            order: Optionale Position (Standard: Ende)
        """
        try:
            if order is None:
                max_order = db.query(BoardList).filter(BoardList.board_id == board_id).count()
                order = max_order

            new_list = BoardList(
                board_id=board_id,
                title=title,
                order=order
            )
            db.add(new_list)
            db.commit()
            db.refresh(new_list)

            return f"Erfolgreich Liste '{title}' (ID: {new_list.id}) erstellt"
        except Exception as e:
            db.rollback()
            return f"Fehler beim Erstellen der Liste: {str(e)}"

    @tool
    def update_list(list_id: str, title: Optional[str] = None, order: Optional[int] = None) -> str:
        """Aktualisiere eine Liste.

        Args:
            list_id: Die ID der zu aktualisierenden Liste
            title: Optionaler neuer Titel
            order: Optionale neue Position
        """
        try:
            lst = db.query(BoardList).filter(BoardList.id == list_id).first()
            if not lst:
                return f"Fehler: Liste mit ID {list_id} nicht gefunden"

            if title is not None:
                lst.title = title
            if order is not None:
                lst.order = order

            db.commit()
            return f"Erfolgreich Liste (ID: {list_id}) aktualisiert"
        except Exception as e:
            db.rollback()
            return f"Fehler beim Aktualisieren der Liste: {str(e)}"

    @tool
    def delete_list(list_id: str) -> str:
        """Lösche eine Liste und alle ihre Karten.

        Args:
            list_id: Die ID der zu löschenden Liste
        """
        try:
            lst = db.query(BoardList).filter(BoardList.id == list_id).first()
            if not lst:
                return f"Fehler: Liste mit ID {list_id} nicht gefunden"

            title = lst.title
            card_count = len(lst.cards)
            db.delete(lst)
            db.commit()
            return f"Erfolgreich Liste '{title}' und {card_count} Karte(n) gelöscht"
        except Exception as e:
            db.rollback()
            return f"Fehler beim Löschen der Liste: {str(e)}"

    @tool
    def get_board_info() -> str:
        """Hole aktuelle Board-Informationen mit allen Listen und Karten."""
        from app.services.agent import get_board_context
        return get_board_context(db, board_id)

    return [
        create_card,
        update_card,
        delete_card,
        move_card,
        create_list,
        update_list,
        delete_list,
        get_board_info
    ]
