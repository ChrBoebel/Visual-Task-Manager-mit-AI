from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor
from langchain.memory import ConversationBufferMemory
from sqlalchemy.orm import Session
from typing import Dict, List
from app.config import settings
from app.services.agent import create_agent_executor


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

    def _get_or_create_agent(self, db: Session, board_id: str) -> AgentExecutor:
        """Get or create agent executor for a board."""
        if board_id not in self.agents:
            # Create agent executor using the agent module
            agent_executor = create_agent_executor(db, board_id, self.llm)
            self.agents[board_id] = agent_executor

            # Store memory reference
            self.memories[board_id] = agent_executor.memory

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
