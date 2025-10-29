import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Board from './pages/Board';
import { boardsApi, listsApi, cardsApi, type Board as BoardType } from './services/api';

export default function App() {
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [activeBoard, setActiveBoard] = useState<BoardType | null>(null);
  const [loading, setLoading] = useState(true);

  // Load boards on mount
  useEffect(() => {
    loadBoards();
  }, []);

  const createDemoBoard = async () => {
    // Create demo board
    const board = await boardsApi.create('Product Roadmap 2024');

    // Create lists
    const todoList = await listsApi.create(board.id, 'To Do', 0);
    const inProgressList = await listsApi.create(board.id, 'In Progress', 1);
    const doneList = await listsApi.create(board.id, 'Done', 2);

    // Create cards in To Do list
    await cardsApi.create({
      list_id: todoList.id,
      title: 'User Authentication Research',
      description: 'Research OAuth providers and authentication flows for the application',
      order: 0,
      labels: ['Research', 'Security'],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    });

    await cardsApi.create({
      list_id: todoList.id,
      title: 'UI Component Design',
      description: 'Design reusable UI components for the dashboard',
      order: 1,
      labels: ['Design', 'UX'],
    });

    // Create card in In Progress list
    await cardsApi.create({
      list_id: inProgressList.id,
      title: 'API Integration',
      description: 'Integrate REST API endpoints with frontend components',
      order: 0,
      labels: ['Development'],
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    });

    // Create cards in Done list
    await cardsApi.create({
      list_id: doneList.id,
      title: 'Project Setup',
      description: 'Initialize repository and configure development environment',
      order: 0,
      labels: ['Setup'],
    });

    await cardsApi.create({
      list_id: doneList.id,
      title: 'Database Schema Design',
      order: 1,
      labels: ['Setup', 'Backend'],
    });

    return board;
  };

  const loadBoards = async () => {
    try {
      setLoading(true);
      const data = await boardsApi.getAll();
      setBoards(data);

      // If no active board but boards exist, select first one
      if (data.length > 0 && !activeBoard) {
        setActiveBoard(data[0]);
      }

      // If there are no boards, create a demo board
      if (data.length === 0) {
        const demoBoard = await createDemoBoard();
        setBoards([demoBoard]);
        setActiveBoard(demoBoard);
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBoard = async (boardId: string) => {
    try {
      const board = await boardsApi.getById(boardId);
      setActiveBoard(board);
    } catch (error) {
      console.error('Failed to load board:', error);
    }
  };

  const handleCreateBoard = async (title: string) => {
    try {
      const newBoard = await boardsApi.create(title);
      setBoards([...boards, newBoard]);
      setActiveBoard(newBoard);
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    try {
      await boardsApi.delete(boardId);
      const updatedBoards = boards.filter((b) => b.id !== boardId);
      setBoards(updatedBoards);

      // If deleted board was active, switch to another board
      if (activeBoard?.id === boardId) {
        if (updatedBoards.length > 0) {
          setActiveBoard(updatedBoards[0]);
        } else {
          // Create new board if none left
          const newBoard = await boardsApi.create('Neues Board');
          setBoards([newBoard]);
          setActiveBoard(newBoard);
        }
      }
    } catch (error) {
      console.error('Failed to delete board:', error);
    }
  };

  const handleBoardUpdate = () => {
    loadBoards();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Lade Boards...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        boards={boards}
        activeBoard={activeBoard}
        onSelectBoard={handleSelectBoard}
        onCreateBoard={handleCreateBoard}
        onDeleteBoard={handleDeleteBoard}
      />
      <div className="flex-1 overflow-hidden">
        {activeBoard ? (
          <Board
            key={activeBoard.id}
            boardId={activeBoard.id}
            onBoardUpdate={handleBoardUpdate}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-background">
            <div className="text-center">
              <p className="text-muted-foreground text-lg mb-4">
                Kein Board ausgewählt
              </p>
              <button
                onClick={() => handleCreateBoard('Neues Board')}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                Erstes Board erstellen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
