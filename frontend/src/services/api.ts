const API_BASE_URL = 'http://localhost:8080/api';

export interface Card {
  id: string;
  title: string;
  description?: string;
  listId: string;
  order: number;
  labels?: string[];
  due_date?: string;
  created_at: string;
}

export interface List {
  id: string;
  title: string;
  boardId: string;
  order: number;
  cards: Card[];
  created_at: string;
}

export interface Board {
  id: string;
  title: string;
  lists: List[];
  created_at: string;
}

// Board API
export const boardsApi = {
  // Get all boards
  getAll: async (): Promise<Board[]> => {
    const response = await fetch(`${API_BASE_URL}/boards`);
    if (!response.ok) throw new Error('Failed to fetch boards');
    return response.json();
  },

  // Get single board with lists and cards
  getById: async (boardId: string): Promise<Board> => {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}`);
    if (!response.ok) throw new Error('Failed to fetch board');
    return response.json();
  },

  // Create new board
  create: async (title: string): Promise<Board> => {
    const response = await fetch(`${API_BASE_URL}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error('Failed to create board');
    return response.json();
  },

  // Update board
  update: async (boardId: string, title: string): Promise<Board> => {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error('Failed to update board');
    return response.json();
  },

  // Delete board
  delete: async (boardId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete board');
  },
};

// List API
export const listsApi = {
  // Create new list
  create: async (boardId: string, title: string, order: number): Promise<List> => {
    const response = await fetch(`${API_BASE_URL}/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_id: boardId, title, order }),
    });
    if (!response.ok) throw new Error('Failed to create list');
    return response.json();
  },

  // Update list
  update: async (listId: string, data: { title?: string; order?: number }): Promise<List> => {
    const response = await fetch(`${API_BASE_URL}/lists/${listId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update list');
    return response.json();
  },

  // Delete list
  delete: async (listId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/lists/${listId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete list');
  },
};

// Card API
export const cardsApi = {
  // Create new card
  create: async (data: {
    list_id: string;
    title: string;
    description?: string;
    order: number;
    labels?: string[];
    due_date?: string;
  }): Promise<Card> => {
    const response = await fetch(`${API_BASE_URL}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create card');
    return response.json();
  },

  // Update card
  update: async (cardId: string, data: {
    title?: string;
    description?: string;
    labels?: string[];
    due_date?: string;
    list_id?: string;
    order?: number;
  }): Promise<Card> => {
    const response = await fetch(`${API_BASE_URL}/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update card');
    return response.json();
  },

  // Delete card
  delete: async (cardId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/cards/${cardId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete card');
  },
};

// Chat API
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  actions_taken: string[];
}

export const chatApi = {
  // Send message to AI assistant
  sendMessage: async (boardId: string, message: string): Promise<ChatResponse> => {
    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_id: boardId, message }),
    });
    if (!response.ok) throw new Error('Failed to send chat message');
    return response.json();
  },

  // Get chat history for a board
  getHistory: async (boardId: string): Promise<ChatMessage[]> => {
    const response = await fetch(`${API_BASE_URL}/chat/history/${boardId}`);
    if (!response.ok) throw new Error('Failed to fetch chat history');
    return response.json();
  },

  // Clear chat history for a board
  clearHistory: async (boardId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/chat/history/${boardId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to clear chat history');
  },
};
