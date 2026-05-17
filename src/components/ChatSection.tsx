'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage, CorrectionStats } from '@/types';

function CorrectionStatsBar({ stats }: { stats: CorrectionStats }) {
  const [expanded, setExpanded] = useState(false);

  const correctionLabel: Record<CorrectionStats['correctionType'], string> = {
    none: 'No correction',
    filtered: 'Irrelevant chunks filtered',
    knowledge_refined: 'Knowledge refined',
    query_reformulated: 'Query reformulated',
    insufficient_context: 'Insufficient context',
  };

  const correctionColor: Record<CorrectionStats['correctionType'], string> = {
    none: 'text-gray-400',
    filtered: 'text-yellow-500',
    knowledge_refined: 'text-blue-500',
    query_reformulated: 'text-orange-500',
    insufficient_context: 'text-red-500',
  };

  return (
    <div className="mt-2 ml-11">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-500 transition-colors"
        aria-label="Toggle CRAG stats"
      >
        <span className="font-semibold tracking-wide uppercase text-[10px]">CRAG</span>
        <span className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
            {stats.highCount} HIGH
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium">
            {stats.ambiguousCount} ~
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">
            {stats.lowCount} LOW
          </span>
        </span>
        <span className={`font-medium ${correctionColor[stats.correctionType]}`}>
          • {correctionLabel[stats.correctionType]}
        </span>
        <span className="text-gray-300 dark:text-gray-600">
          {(stats.evaluationTimeMs / 1000).toFixed(1)}s
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-xs space-y-1.5 max-w-md">
          <div className="flex justify-between text-gray-500">
            <span>Chunks evaluated</span>
            <span className="font-medium text-[var(--foreground)]">{stats.totalEvaluated}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Highly relevant</span>
            <span className="font-medium text-green-600 dark:text-green-400">{stats.highCount}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Partially relevant (refined)</span>
            <span className="font-medium text-yellow-600 dark:text-yellow-400">{stats.ambiguousCount}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Irrelevant (discarded)</span>
            <span className="font-medium text-red-600 dark:text-red-400">{stats.lowCount}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Correction applied</span>
            <span className={`font-medium ${stats.correctionApplied ? 'text-blue-500' : 'text-gray-400'}`}>
              {stats.correctionApplied ? 'Yes' : 'No'}
            </span>
          </div>
          {stats.queryReformulated && (
            <div className="pt-1 border-t border-[var(--border)]">
              <span className="text-gray-500">Reformulated query:</span>
              <p className="mt-0.5 text-[var(--foreground)] italic">"{stats.queryReformulated}"</p>
            </div>
          )}
          <div className="flex justify-between text-gray-500 pt-1 border-t border-[var(--border)]">
            <span>Eval time</span>
            <span className="font-medium text-[var(--foreground)]">{stats.evaluationTimeMs}ms</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatSection() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage }),
      });

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          correctionStats: data.correctionStats,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Failed to get answer. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative bg-[var(--background)] rounded-xl overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 scroll-smooth custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <p className="text-sm font-medium">How can I help you with your document today?</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`flex max-w-[85%] sm:max-w-[80%] items-start space-x-3 ${
                  msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border)] ${
                    msg.role === 'user'
                      ? 'bg-[var(--foreground)] text-[var(--background)]'
                      : 'bg-white dark:bg-black text-black dark:text-white'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <span className="text-xs font-bold">U</span>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                      <circle cx="8.5" cy="10.5" r="1.5" />
                      <circle cx="15.5" cy="10.5" r="1.5" />
                      <path d="M12 16.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" />
                    </svg>
                  )}
                </div>
                <div
                  className={`px-4 py-2 text-[0.95rem] ${
                    msg.role === 'user'
                      ? 'bg-[var(--bubble-user)] text-[var(--foreground)] rounded-3xl'
                      : 'bg-transparent text-[var(--foreground)] py-1'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
              {msg.role === 'assistant' && msg.correctionStats && (
                <CorrectionStatsBar stats={msg.correctionStats} />
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="flex max-w-[85%] items-start space-x-3 flex-row">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border)] bg-white dark:bg-black text-black dark:text-white">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  <circle cx="8.5" cy="10.5" r="1.5" />
                  <circle cx="15.5" cy="10.5" r="1.5" />
                  <path d="M12 16.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" />
                </svg>
              </div>
              <div className="py-2">
                <div className="flex gap-1.5 items-center h-6">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[var(--background)]">
        <form
          onSubmit={handleSubmit}
          className="flex max-w-3xl mx-auto relative bg-[var(--panel)] border border-[var(--border)] rounded-full overflow-hidden focus-within:ring-1 focus-within:ring-[var(--border)] transition-shadow"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message DocuMind..."
            className="flex-1 px-6 py-3.5 bg-transparent border-none focus:outline-none focus:ring-0 text-[var(--foreground)] text-[0.95rem]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="m-2 w-9 h-9 flex-shrink-0 bg-[var(--foreground)] hover:bg-gray-800 dark:hover:bg-gray-200 text-[var(--background)] rounded-full disabled:opacity-30 disabled:hover:bg-[var(--foreground)] transition-colors flex items-center justify-center"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          </button>
        </form>
        <div className="text-center mt-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            DocuMind AI can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  );
}
