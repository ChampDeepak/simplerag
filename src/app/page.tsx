'use client';

import { useState } from 'react';
import UploadSection from '@/components/UploadSection';
import ChatSection from '@/components/ChatSection';

export default function Home() {
  const [status, setStatus] = useState('');
  const [resetChat, setResetChat] = useState(0);

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <header className="border-b border-[var(--border)] px-4 py-3 flex items-center justify-between bg-[var(--background)]">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">DocuMind AI</h1>
      </header>
      
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-60px)]">
        <div className="md:col-span-4 flex flex-col gap-4 h-full">
          <div className="panel p-6 flex flex-col gap-4 flex-1">
            <h2 className="text-lg font-medium text-[var(--foreground)]">Knowledge Base</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Upload documents to expand the AI's knowledge.</p>
            <div className="flex-1 min-h-[250px]">
              <UploadSection onUploadComplete={(msg) => {
                setStatus(msg);
                setResetChat(prev => prev + 1);
              }} />
            </div>
            {status && (
              <div className={`p-3 rounded-lg text-sm border ${status.includes('Error') || status.includes('failed') ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50' : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50'}`}>
                {status}
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-8 panel flex flex-col h-full overflow-hidden">
          <div className="border-b border-[var(--border)] px-6 py-4 bg-[var(--panel)]">
            <h2 className="text-lg font-medium text-[var(--foreground)]">Chat</h2>
          </div>
          <div className="flex-1 overflow-hidden relative bg-[var(--background)]">
             <ChatSection key={resetChat} />
          </div>
        </div>
      </main>
    </div>
  );
}
