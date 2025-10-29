import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreHorizontal, Trash2, Check, X, GripVertical } from 'lucide-react';
import Card from './Card';
import AddCardForm from './AddCardForm';
import type { List as ListType } from '../types';

interface ListProps {
  list: ListType;
  onAddCard: (listId: string, title: string) => void;
  onCardClick: (cardId: string) => void;
  onUpdateListTitle: (listId: string, title: string) => void;
  onDeleteList: (listId: string) => void;
}

export default function List({ list, onAddCard, onCardClick, onUpdateListTitle, onDeleteList }: ListProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ id: list.id });

  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: list.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.3 : 1,
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [showMenu, setShowMenu] = useState(false);

  const handleTitleSubmit = () => {
    if (title.trim() && title !== list.title) {
      onUpdateListTitle(list.id, title.trim());
    } else {
      setTitle(list.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTitle(list.title);
      setIsEditingTitle(false);
    }
  };

  const handleAddCard = (cardTitle: string) => {
    onAddCard(list.id, cardTitle);
    setShowAddForm(false);
  };

  const handleDeleteList = () => {
    if (confirm(`Are you sure you want to delete "${list.title}" and all its cards?`)) {
      onDeleteList(list.id);
    }
    setShowMenu(false);
  };

  return (
    <div ref={setSortableNodeRef} style={style} className="flex-shrink-0 w-80 group" {...attributes}>
      <div className={`bg-muted/50 rounded-lg p-3 border transition-all duration-200 ${
        isDragging
          ? 'border-primary shadow-2xl'
          : 'border-border hover:shadow-lg hover:border-primary/50 hover:scale-[1.02]'
      }`}>
        {/* List Header */}
        <div className="flex items-center gap-2 mb-3">
          <button
            ref={setActivatorNodeRef}
            {...listeners}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex items-center justify-between flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleTitleKeyDown}
                className="flex-1 px-2 py-1 bg-background border border-primary rounded text-foreground font-semibold focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleTitleSubmit}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <Check className="w-4 h-4 text-green-500" />
              </button>
              <button
                onClick={() => {
                  setTitle(list.title);
                  setIsEditingTitle(false);
                }}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ) : (
            <h2
              onClick={() => setIsEditingTitle(true)}
              className="font-semibold text-foreground cursor-pointer hover:bg-accent px-2 py-1 rounded -ml-2"
            >
              {list.title}
              <span className="ml-2 text-sm text-muted-foreground">
                {list.cards.length}
              </span>
            </h2>
          )}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-muted border border-border rounded-lg shadow-lg z-10">
                  <button
                    onClick={handleDeleteList}
                    className="w-full px-4 py-2 text-left text-red-500 hover:bg-accent rounded-lg flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete list
                  </button>
                </div>
              </>
            )}
          </div>
          </div>
        </div>

        {/* Cards Container */}
        <div
          ref={setDroppableNodeRef}
          className="min-h-[200px] transition-colors duration-200 rounded-lg p-2 -m-2"
        >
          <SortableContext
            items={list.cards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {list.cards.map((card) => (
              <Card
                key={card.id}
                card={card}
                onClick={() => onCardClick(card.id)}
              />
            ))}
          </SortableContext>
        </div>

        {/* Add Card Section */}
        {showAddForm ? (
          <AddCardForm
            onAdd={handleAddCard}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add a card</span>
          </button>
        )}
      </div>
    </div>
  );
}
