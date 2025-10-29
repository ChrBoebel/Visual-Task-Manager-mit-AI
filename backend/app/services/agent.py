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
    # Get board context
    context = get_board_context(db, board_id)

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
