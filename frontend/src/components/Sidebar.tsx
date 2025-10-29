import { useState } from 'react';
import { Plus, Layout, Trash2 } from 'lucide-react';
import type { Board } from '../services/api';

interface SidebarProps {
  boards: Board[];
  activeBoard: Board | null;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: (title: string) => void;
  onDeleteBoard: (boardId: string) => void;
}

export default function Sidebar({
  boards,
  activeBoard,
  onSelectBoard,
  onCreateBoard,
  onDeleteBoard,
}: SidebarProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBoardTitle.trim()) {
      onCreateBoard(newBoardTitle.trim());
      setNewBoardTitle('');
      setShowAddForm(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation();
    if (confirm('Möchten Sie dieses Board wirklich löschen?')) {
      onDeleteBoard(boardId);
    }
  };

  return (
    <div className="w-64 h-screen bg-background border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Layout className="w-5 h-5 text-primary" />
          Boards
        </h2>
      </div>

      {/* Board List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {boards.map((board) => (
          <div
            key={board.id}
            onClick={() => onSelectBoard(board.id)}
            className={`
              group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all
              ${
                activeBoard?.id === board.id
                  ? 'bg-primary text-white shadow-md'
                  : 'hover:bg-muted text-foreground'
              }
            `}
          >
            <span className="font-medium truncate flex-1">{board.title}</span>
            {activeBoard?.id !== board.id && (
              <button
                onClick={(e) => handleDelete(e, board.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Board Section */}
      <div className="p-3 border-t border-border">
        {showAddForm ? (
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowAddForm(false);
                  setNewBoardTitle('');
                }
              }}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Board-Name..."
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
              >
                Erstellen
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewBoardTitle('');
                }}
                className="px-3 py-2 bg-muted border border-border text-foreground rounded-lg hover:bg-accent transition-colors text-sm"
              >
                Abbrechen
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-muted hover:bg-accent text-foreground transition-colors border border-border hover:border-primary"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Neues Board</span>
          </button>
        )}
      </div>
    </div>
  );
}
