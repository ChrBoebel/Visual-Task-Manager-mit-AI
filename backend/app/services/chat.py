from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain.memory import ConversationBufferMemory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime
from app.config import settings
from app.models import Board, List as BoardList, Card


class ChatService:
    """AI Chat service using LangChain with Google Gemini for board operations."""

    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.7
        )
        self.agents: Dict[str, AgentExecutor] = {}  # board_id -> agent executor
        self.memories: Dict[str, ConversationBufferMemory] = {}  # board_id -> memory

    def _get_board_context(self, db: Session, board_id: str) -> str:
        """Build rich context string from board data."""
        board = db.query(Board).filter(Board.id == board_id).first()
        if not board:
            return "Board nicht gefunden."

        context = f"Board: {board.title}\n"
        context += f"Board ID: {board.id}\n\n"

        # Add lists and cards
        lists = sorted(board.lists, key=lambda x: x.order)
        for lst in lists:
            context += f"Liste: {lst.title} (ID: {lst.id}, Order: {lst.order})\n"
            cards = sorted(lst.cards, key=lambda x: x.order)
            if cards:
                for card in cards:
                    context += f"  - Karte: {card.title} (ID: {card.id})\n"
                    if card.description:
                        context += f"    Beschreibung: {card.description}\n"
                    if card.labels:
                        context += f"    Labels: {', '.join(card.labels)}\n"
                    if card.due_date:
                        context += f"    Fällig: {card.due_date.strftime('%Y-%m-%d')}\n"
                    context += f"    Order: {card.order}\n"
            else:
                context += "  (Keine Karten)\n"
            context += "\n"

        return context

    def _create_tools(self, db: Session, board_id: str) -> List:
        """Create LangChain tools for board operations."""

        @tool
        def create_card(
            list_id: str,
            title: str,
            description: Optional[str] = None,
            labels: Optional[str] = None,  # Changed to str for LangChain compatibility
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
            labels: Optional[str] = None,  # Changed to str
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
            return self._get_board_context(db, board_id)

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

    def _get_or_create_agent(self, db: Session, board_id: str) -> AgentExecutor:
        """Get or create agent executor for a board."""
        if board_id not in self.agents:
            # Get board context
            context = self._get_board_context(db, board_id)

            # Create prompt template with German instructions
            prompt = ChatPromptTemplate.from_messages([
                ("system", f"""Du bist ein KI-Assistent, der beim Verwalten eines Trello-ähnlichen Boards hilft.

Aktueller Board-Status:
{context}

Du kannst Nutzern helfen durch:
- Erstellen, Bearbeiten und Löschen von Karten
- Verschieben von Karten zwischen Listen
- Erstellen, Bearbeiten und Löschen von Listen
- Bereitstellen von Informationen über das Board

Bestätige immer, was du gemacht hast, nachdem du Aktionen ausgeführt hast. Sei präzise und hilfsbereit. Antworte immer auf Deutsch.

Nutze die verfügbaren Tools, um Board-Operationen durchzuführen. Du kannst mehrere Tools nacheinander nutzen, um komplexe Aufgaben zu erledigen."""),
                MessagesPlaceholder(variable_name="chat_history", optional=True),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ])

            # Create tools
            tools = self._create_tools(db, board_id)

            # Create agent
            agent = create_tool_calling_agent(self.llm, tools, prompt)

            # Create memory
            memory = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True,
                output_key="output"
            )
            self.memories[board_id] = memory

            # Create agent executor
            agent_executor = AgentExecutor(
                agent=agent,
                tools=tools,
                memory=memory,
                verbose=True,
                max_iterations=15,
                return_intermediate_steps=True,
                handle_parsing_errors=True
            )
            self.agents[board_id] = agent_executor

        return self.agents[board_id]

    def send_message(self, db: Session, board_id: str, message: str) -> Dict:
        """Send a message to the AI and get a response with automatic function calling.

        Args:
            db: Database session
            board_id: Board ID for context
            message: User message

        Returns:
            Dict with 'response' and 'actions_taken' keys
        """
        try:
            # Get or create agent for this board
            agent_executor = self._get_or_create_agent(db, board_id)

            # Execute agent
            result = agent_executor.invoke({"input": message})

            # Extract actions taken from intermediate steps
            actions_taken = []
            if "intermediate_steps" in result:
                for action, observation in result["intermediate_steps"]:
                    if hasattr(action, 'tool') and observation:
                        actions_taken.append(observation)

            return {
                'response': result.get('output', ''),
                'actions_taken': actions_taken
            }

        except Exception as e:
            return {
                'response': f"Entschuldigung, da ist ein Fehler aufgetreten: {str(e)}",
                'actions_taken': []
            }

    def get_history(self, board_id: str) -> List[Dict]:
        """Get chat history for a board.

        Returns:
            List of messages with 'role' and 'content' keys
        """
        if board_id not in self.memories:
            return []

        memory = self.memories[board_id]
        messages = []

        # Get messages from memory
        chat_history = memory.chat_memory.messages

        for msg in chat_history:
            role = 'user' if msg.type == 'human' else 'assistant'
            messages.append({
                'role': role,
                'content': msg.content
            })

        return messages

    def clear_history(self, board_id: str) -> bool:
        """Clear chat history for a board.

        Returns:
            True if cleared, False if no session existed
        """
        if board_id in self.agents:
            del self.agents[board_id]
        if board_id in self.memories:
            del self.memories[board_id]
            return True
        return False


# Global chat service instance
chat_service = ChatService()
