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
        self.full_messages: Dict[str, List[Dict]] = {}  # board_id -> full messages with tool_calls

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

            # Refresh board context before execution
            # This ensures the agent sees the latest state via get_board_info() tool
            from app.services.agent import get_board_context
            current_context = get_board_context(db, board_id)

            # Add context hint to help agent understand current state if needed
            # (Agent is instructed to use get_board_info() tool, but we provide fallback)
            enhanced_input = f"{message}"

            # Execute agent with potentially enhanced input
            result = agent_executor.invoke({"input": enhanced_input})

            # Extract actions taken and tool calls from intermediate steps
            actions_taken = []
            tool_calls = []

            if "intermediate_steps" in result:
                for action, observation in result["intermediate_steps"]:
                    if hasattr(action, 'tool') and observation:
                        # Add simple string for backwards compatibility
                        actions_taken.append(observation)

                        # Add structured tool call info
                        tool_calls.append({
                            'tool': action.tool,
                            'input': action.tool_input if hasattr(action, 'tool_input') else {},
                            'output': observation
                        })

            # Store full message history with tool_calls for persistence
            if board_id not in self.full_messages:
                self.full_messages[board_id] = []

            # Add user message
            self.full_messages[board_id].append({
                'role': 'user',
                'content': message
            })

            # Add assistant message with tool_calls
            self.full_messages[board_id].append({
                'role': 'assistant',
                'content': result.get('output', ''),
                'tool_calls': tool_calls
            })

            return {
                'response': result.get('output', ''),
                'actions_taken': actions_taken,
                'tool_calls': tool_calls
            }

        except Exception as e:
            return {
                'response': f"Entschuldigung, da ist ein Fehler aufgetreten: {str(e)}",
                'actions_taken': []
            }

    def get_history(self, board_id: str) -> List[Dict]:
        """Get chat history for a board.

        Returns:
            List of messages with 'role', 'content', and optionally 'tool_calls' keys
        """
        # Return full messages with tool_calls if available
        if board_id in self.full_messages:
            return self.full_messages[board_id]

        return []

    def clear_history(self, board_id: str) -> bool:
        """Clear chat history for a board.

        Returns:
            True if cleared, False if no session existed
        """
        cleared = False
        if board_id in self.agents:
            del self.agents[board_id]
            cleared = True
        if board_id in self.memories:
            del self.memories[board_id]
            cleared = True
        if board_id in self.full_messages:
            del self.full_messages[board_id]
            cleared = True
        return cleared


# Global chat service instance
chat_service = ChatService()
