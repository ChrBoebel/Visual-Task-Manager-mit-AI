import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface AddCardFormProps {
  onAdd: (title: string) => void;
  onCancel: () => void;
}

export default function AddCardForm({ onAdd, onCancel }: AddCardFormProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim());
      setTitle('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-2">
      <textarea
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        placeholder="Enter a title for this card..."
        rows={3}
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          Add card
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 hover:bg-accent rounded transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </form>
  );
}
