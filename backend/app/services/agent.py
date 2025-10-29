from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain.memory import ConversationBufferMemory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from sqlalchemy.orm import Session
from app.config import settings
from app.models import Board
from app.services.tools import create_board_tools


def get_board_context(db: Session, board_id: str) -> str:
    """Build rich context string from board data.

    Args:
        db: Database session
        board_id: Board ID

    Returns:
        Rich text description of board state
    """
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


def create_agent_executor(
    db: Session,
    board_id: str,
    llm: ChatGoogleGenerativeAI
) -> AgentExecutor:
    """Create agent executor for a board.

    Args:
        db: Database session
        board_id: Board ID
        llm: Language model instance

    Returns:
        AgentExecutor configured for board operations
    """
    # Create prompt template with German instructions (without static context)
    prompt = ChatPromptTemplate.from_messages([
        ("system", """Du bist ein KI-Assistent, der beim Verwalten eines Kanban Boards hilft.

WICHTIGE VERHALTENSREGELN:
1. **IMMER get_board_info() nutzen**: Bevor du Aktionen planst, nutze ZUERST das get_board_info() Tool, um den aktuellen Board-Status zu sehen.
2. **IDs merken**: Wenn du eine Liste oder Karte erstellst, wird dir die ID in der Tool-Ausgabe gegeben (z.B. "ID: abc-123"). MERKE dir diese ID für weitere Operationen!
3. **Nach Änderungen aktualisieren**: Nach dem Erstellen/Ändern von Ressourcen, nutze get_board_info() erneut, wenn du weitere Operationen planst.
4. **IDs aus Ausgaben extrahieren**: Tool-Ausgaben enthalten IDs im Format "(ID: xxx)". Extrahiere und verwende diese IDs direkt.

Du kannst Nutzern helfen durch:
- Erstellen, Bearbeiten und Löschen von Karten
- Verschieben von Karten zwischen Listen
- Erstellen, Bearbeiten und Löschen von Listen
- Bereitstellen von Informationen über das Board

WORKFLOW-BEISPIEL:
User: "Erstelle eine Liste und füge Karten hinzu"
1. get_board_info() → Aktuellen Status laden
2. create_list("Meine Liste") → Merke die ID aus der Ausgabe (z.B. ID: list-123)
3. create_card(list_id="list-123", title="Karte 1") → Nutze die gemerkte ID
4. create_card(list_id="list-123", title="Karte 2") → Nutze dieselbe ID

Bestätige immer, was du gemacht hast. Sei präzise und hilfsbereit. Antworte immer auf Deutsch."""),
        MessagesPlaceholder(variable_name="chat_history", optional=True),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    # Create tools
    tools = create_board_tools(db, board_id)

    # Create agent
    agent = create_tool_calling_agent(llm, tools, prompt)

    # Create memory
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True,
        output_key="output"
    )

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

    return agent_executor
