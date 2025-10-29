import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import List from '../components/List';
import Card from '../components/Card';
import CardModal from '../components/CardModal';
import ChatBot from '../components/ChatBot';
import { boardsApi, listsApi, cardsApi, type Board as BoardType, type Card as CardType, type List as ListType } from '../services/api';

interface BoardProps {
  boardId: string;
  onBoardUpdate: () => void;
}

export default function Board({ boardId, onBoardUpdate }: BoardProps) {
  const [board, setBoard] = useState<BoardType | null>(null);
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [activeList, setActiveList] = useState<ListType | null>(null);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [showAddList, setShowAddList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load board data
  useEffect(() => {
    loadBoard();
  }, [boardId]);

  const loadBoard = async () => {
    try {
      setLoading(true);
      const data = await boardsApi.getById(boardId);
      setBoard(data);
      setBoardTitle(data.title);
    } catch (error) {
      console.error('Failed to load board:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBoardTitle = async () => {
    if (!board || !boardTitle.trim()) {
      setBoardTitle(board?.title || '');
      setIsEditingTitle(false);
      return;
    }

    if (boardTitle.trim() === board.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await boardsApi.update(board.id, boardTitle.trim());
      setBoard({ ...board, title: boardTitle.trim() });
      setIsEditingTitle(false);
      onBoardUpdate();
    } catch (error) {
      console.error('Failed to update board title:', error);
      setBoardTitle(board.title);
      setIsEditingTitle(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;

    // Check if dragging a list
    const list = board?.lists.find((l) => l.id === active.id);
    if (list) {
      setActiveList(list);
      return;
    }

    // Check if dragging a card
    const card = board?.lists
      .flatMap((list) => list.cards)
      .find((c) => c.id === active.id);
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !board) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    setBoard((prevBoard) => {
      if (!prevBoard) return prevBoard;
      const newLists = [...prevBoard.lists];

      // Check if dragging a list
      const activeListIndex = newLists.findIndex((list) => list.id === activeId);
      const overListIndex = newLists.findIndex((list) => list.id === overId);

      if (activeListIndex !== -1 && overListIndex !== -1) {
        // Reordering lists
        const [movedList] = newLists.splice(activeListIndex, 1);
        newLists.splice(overListIndex, 0, movedList);
        return { ...prevBoard, lists: newLists };
      }

      // Otherwise, handle card dragging (existing logic)
      const activeList = newLists.find((list) =>
        list.cards.some((card) => card.id === activeId)
      );
      if (!activeList) return prevBoard;

      const activeCardIndex = activeList.cards.findIndex(
        (card) => card.id === activeId
      );
      const activeCard = activeList.cards[activeCardIndex];

      const overList = newLists.find((list) =>
        list.cards.some((card) => card.id === overId)
      );
      const overListDirect = newLists.find((list) => list.id === overId);

      let targetList = overList || overListDirect;
      if (!targetList) return prevBoard;

      activeList.cards.splice(activeCardIndex, 1);

      if (overList) {
        const overCardIndex = targetList.cards.findIndex(
          (card) => card.id === overId
        );
        targetList.cards.splice(overCardIndex, 0, {
          ...activeCard,
          listId: targetList.id,
        });
      } else {
        targetList.cards.push({
          ...activeCard,
          listId: targetList.id,
        });
      }

      return { ...prevBoard, lists: newLists };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active } = event;
    setActiveCard(null);
    setActiveList(null);

    if (!board) return;

    const activeId = active.id as string;

    // Check if a list was moved
    const list = board.lists.find((l) => l.id === activeId);
    if (list) {
      try {
        // Update all lists with their current order to keep them in sync
        const updatePromises = board.lists.map((list, index) =>
          listsApi.update(list.id, { order: index })
        );
        await Promise.all(updatePromises);
      } catch (error) {
        console.error('Failed to update list positions:', error);
        loadBoard();
      }
      return;
    }

    // Otherwise, handle card movement
    const card = board.lists
      .flatMap((list) => list.cards)
      .find((c) => c.id === activeId);

    if (card) {
      const list = board.lists.find((l) => l.id === card.listId);
      if (list) {
        try {
          // Update all cards in the affected list with their current order
          const updatePromises = list.cards.map((c, index) =>
            cardsApi.update(c.id, {
              list_id: c.listId,
              order: index,
            })
          );
          await Promise.all(updatePromises);
        } catch (error) {
          console.error('Failed to update card positions:', error);
          loadBoard();
        }
      }
    }
  };

  const handleAddCard = async (listId: string, title: string) => {
    if (!board) return;

    const list = board.lists.find((l) => l.id === listId);
    if (!list) return;

    try {
      const newCard = await cardsApi.create({
        list_id: listId,
        title,
        order: list.cards.length,
      });

      setBoard({
        ...board,
        lists: board.lists.map((l) =>
          l.id === listId ? { ...l, cards: [...l.cards, newCard] } : l
        ),
      });
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  };

  const handleCardClick = (cardId: string) => {
    const card = board?.lists
      .flatMap((list) => list.cards)
      .find((c) => c.id === cardId);
    if (card) {
      setEditingCard(card);
    }
  };

  const handleSaveCard = async (updatedCard: CardType) => {
    try {
      await cardsApi.update(updatedCard.id, {
        title: updatedCard.title,
        description: updatedCard.description,
        labels: updatedCard.labels,
        due_date: updatedCard.due_date,
      });

      if (board) {
        setBoard({
          ...board,
          lists: board.lists.map((list) => ({
            ...list,
            cards: list.cards.map((card) =>
              card.id === updatedCard.id ? updatedCard : card
            ),
          })),
        });
      }
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await cardsApi.delete(cardId);

      if (board) {
        setBoard({
          ...board,
          lists: board.lists.map((list) => ({
            ...list,
            cards: list.cards.filter((card) => card.id !== cardId),
          })),
        });
      }
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  const handleUpdateListTitle = async (listId: string, title: string) => {
    try {
      await listsApi.update(listId, { title });

      if (board) {
        setBoard({
          ...board,
          lists: board.lists.map((list) =>
            list.id === listId ? { ...list, title } : list
          ),
        });
      }
    } catch (error) {
      console.error('Failed to update list:', error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await listsApi.delete(listId);

      if (board) {
        setBoard({
          ...board,
          lists: board.lists.filter((list) => list.id !== listId),
        });
      }
      onBoardUpdate();
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  };

  const handleAddList = async () => {
    if (!newListTitle.trim() || !board) return;

    try {
      const newList = await listsApi.create(
        board.id,
        newListTitle.trim(),
        board.lists.length
      );

      setBoard({
        ...board,
        lists: [...board.lists, newList],
      });

      setNewListTitle('');
      setShowAddList(false);
      onBoardUpdate();
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Lade Board...</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Board nicht gefunden</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-muted/30 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isEditingTitle ? (
              <input
                type="text"
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                onBlur={handleUpdateBoardTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateBoardTitle();
                  if (e.key === 'Escape') {
                    setBoardTitle(board.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="text-2xl font-bold bg-background border-2 border-primary rounded px-3 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors px-3 py-1 rounded hover:bg-muted"
              >
                {board.title}
              </h1>
            )}
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 p-6 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            <SortableContext
              items={board.lists.map((list) => list.id)}
              strategy={horizontalListSortingStrategy}
            >
              {board.lists.map((list) => (
                <List
                  key={list.id}
                  list={list}
                  onAddCard={handleAddCard}
                  onCardClick={handleCardClick}
                  onUpdateListTitle={handleUpdateListTitle}
                  onDeleteList={handleDeleteList}
                />
              ))}
            </SortableContext>

            {/* Add List Section */}
            <div className="flex-shrink-0 w-80">
            {showAddList ? (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddList();
                    if (e.key === 'Escape') {
                      setShowAddList(false);
                      setNewListTitle('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                  placeholder="Listentitel eingeben..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddList}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    Liste hinzufügen
                  </button>
                  <button
                    onClick={() => {
                      setShowAddList(false);
                      setNewListTitle('');
                    }}
                    className="px-4 py-2 bg-muted border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddList(true)}
                className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors border border-border"
              >
                <span>+ Weitere Liste</span>
              </button>
            )}
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeList ? (
              <div className="rotate-6 scale-105 shadow-2xl w-80">
                <div className="bg-muted border-2 border-primary rounded-lg p-3">
                  <h2 className="font-semibold text-foreground">
                    {activeList.title}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {activeList.cards.length}
                    </span>
                  </h2>
                </div>
              </div>
            ) : activeCard ? (
              <div className="rotate-6 scale-105 shadow-2xl">
                <div className="bg-muted border-2 border-primary rounded-lg p-3">
                  <div className="font-medium text-foreground">{activeCard.title}</div>
                  {activeCard.labels && activeCard.labels.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {activeCard.labels.map((label, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Card Edit Modal */}
      {editingCard && (
        <CardModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
        />
      )}

      {/* AI ChatBot */}
      <ChatBot
        boardId={boardId}
        onBoardUpdate={loadBoard}
        isOpen={isChatOpen}
        setIsOpen={setIsChatOpen}
      />
    </div>
  );
}
