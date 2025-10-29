import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Trash2, Loader2, ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { chatApi, type ChatMessage, type ToolCall } from '../services/api';

interface ChatBotProps {
  boardId: string;
  onBoardUpdate: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function ChatBot({ boardId, onBoardUpdate, isOpen, setIsOpen }: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionsFeedback, setActionsFeedback] = useState<string[]>([]);
  const [collapsedToolCalls, setCollapsedToolCalls] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, actionsFeedback]);

  // Load chat history when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, boardId]); // Re-load when board changes

  const loadHistory = async () => {
    try {
      const history = await chatApi.getHistory(boardId);
      // Don't overwrite messages if we already have some (prevents tool_calls loss)
      setMessages((prev) => {
        if (prev.length > 0) {
          return prev;
        }
        return history;
      });
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to UI
    setMessages((prev) => [...prev, { role: 'user' as const, content: userMessage }]);
    setActionsFeedback([]);
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(boardId, userMessage);

      // Add AI response to UI with tool_calls
      const newAssistantMessage = {
        role: 'assistant' as const,
        content: response.response,
        tool_calls: response.tool_calls || []
      };

      setMessages((prev) => [...prev, newAssistantMessage]);

      // Show actions taken
      if (response.actions_taken && response.actions_taken.length > 0) {
        setActionsFeedback(response.actions_taken);
        // Refresh board if AI made changes
        setTimeout(() => {
          onBoardUpdate();
        }, 500);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Entschuldigung, da ist etwas schiefgelaufen. Bitte versuch es nochmal.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Möchtest du wirklich den gesamten Gesprächsverlauf für dieses Board löschen?')) return;

    try {
      await chatApi.clearHistory(boardId);
      setMessages([]);
      setActionsFeedback([]);
      setCollapsedToolCalls(new Set());
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const toggleToolCalls = (index: number) => {
    setCollapsedToolCalls((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-primary hover:bg-primary-hover text-white rounded-full p-4 shadow-lg transition-all duration-300 z-50"
        title="KI-Assistent"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-[oklch(0.27_0.00_106.64)] border border-[oklch(0.35_0.00_106.64)] rounded-xl shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[oklch(0.35_0.00_106.64)]">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} className="text-primary" />
              <h3 className="font-semibold text-white">KI-Assistent</h3>
            </div>
            <button
              onClick={handleClearHistory}
              className="text-gray-400 hover:text-white transition-colors"
              title="Gesprächsverlauf löschen"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-gray-400 mt-8">
                <MessageCircle size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  Hi! Ich bin dein KI-Assistent und helfe dir beim Organisieren deines Boards.
                </p>
                <p className="text-xs mt-2 opacity-75">
                  Probier's aus: „Erstelle eine Karte mit dem Titel 'Neue Aufgabe'"
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className="space-y-2">
                <div
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-[oklch(0.32_0.00_106.64)] text-gray-100'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>

                {/* Tool Calls for this message */}
                {message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0 && (
                  <div className="ml-2 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                    <button
                      onClick={() => toggleToolCalls(index)}
                      className="w-full flex items-center justify-between p-3 text-xs font-semibold text-blue-400 hover:bg-blue-900/20 transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Wrench size={14} />
                        <span>Tool Calls ({message.tool_calls.length})</span>
                      </div>
                      {!collapsedToolCalls.has(index) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {!collapsedToolCalls.has(index) && (
                      <div className="px-3 pb-3 space-y-2">
                        {message.tool_calls.map((call, callIndex) => (
                          <div key={callIndex} className="bg-[oklch(0.27_0.00_106.64)] rounded p-2 space-y-1">
                            <div className="flex items-center gap-2 text-xs font-mono text-blue-300">
                              <span className="text-blue-500">→</span>
                              <span className="font-semibold">{call.tool}</span>
                            </div>

                            {Object.keys(call.input).length > 0 && (
                              <div className="text-xs pl-4">
                                <span className="text-gray-500">Parameter:</span>
                                <div className="mt-1 font-mono text-gray-400">
                                  {Object.entries(call.input).map(([key, value]) => (
                                    <div key={key} className="truncate">
                                      <span className="text-blue-400">{key}:</span>{' '}
                                      <span className="text-gray-300">
                                        {typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="text-xs pl-4">
                              <span className="text-gray-500">Ergebnis:</span>
                              <div className="mt-1 text-green-300">{call.output}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Actions Feedback */}
            {actionsFeedback.length > 0 && (
              <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-green-400 mb-1">
                  Ausgeführte Aktionen:
                </p>
                {actionsFeedback.map((action, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs text-green-300">
                    <span className="text-green-500">✓</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[oklch(0.32_0.00_106.64)] rounded-lg px-4 py-3 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <span className="text-sm text-gray-300">Einen Moment...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[oklch(0.35_0.00_106.64)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Frag mich etwas oder gib mir einen Auftrag..."
                className="flex-1 bg-[oklch(0.32_0.00_106.64)] border border-[oklch(0.40_0.00_106.64)] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-primary hover:bg-primary-hover disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
