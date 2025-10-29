import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, Tag } from 'lucide-react';
import type { Card as CardType } from '../types';

interface CardProps {
  card: CardType;
  onClick: () => void;
}

export default function Card({ card, onClick }: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    cursor: isDragging ? 'grabbing' : 'pointer',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-muted border border-border rounded-lg p-3 mb-2 hover:bg-accent hover:shadow-lg cursor-pointer group transition-all duration-200 hover:scale-[1.02]"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground mb-1">{card.title}</h3>
          {card.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {card.description}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {card.labels && card.labels.length > 0 && (
              <div className="flex gap-1">
                {card.labels.map((label, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-primary/20 text-primary"
                  >
                    <Tag className="w-3 h-3" />
                    {label}
                  </span>
                ))}
              </div>
            )}
            {card.due_date && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {new Date(card.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
