import { useState, useEffect } from 'react';
import { X, Tag, Calendar, Trash2 } from 'lucide-react';
import type { Card } from '../types';

interface CardModalProps {
  card: Card;
  onClose: () => void;
  onSave: (card: Card) => void;
  onDelete: (cardId: string) => void;
}

export default function CardModal({ card, onClose, onSave, onDelete }: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [labels, setLabels] = useState<string[]>(card.labels || []);
  const [newLabel, setNewLabel] = useState('');
  const [dueDate, setDueDate] = useState(
    card.due_date ? new Date(card.due_date).toISOString().split('T')[0] : ''
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSave = () => {
    onSave({
      ...card,
      title,
      description,
      labels,
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
    });
    onClose();
  };

  const handleAddLabel = () => {
    if (newLabel.trim() && !labels.includes(newLabel.trim())) {
      setLabels([...labels, newLabel.trim()]);
      setNewLabel('');
    }
  };

  const handleRemoveLabel = (label: string) => {
    setLabels(labels.filter((l) => l !== label));
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this card?')) {
      onDelete(card.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-muted border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold bg-transparent border-none outline-none text-foreground w-full focus:ring-2 focus:ring-primary rounded px-2 py-1 -ml-2"
              placeholder="Card title..."
            />
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px] resize-y"
              placeholder="Add a more detailed description..."
            />
          </div>

          {/* Labels */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Labels
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-primary/20 text-primary"
                >
                  {label}
                  <button
                    onClick={() => handleRemoveLabel(label)}
                    className="hover:bg-primary/30 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Add label..."
              />
              <button
                onClick={handleAddLabel}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-between">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Card
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-muted border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
