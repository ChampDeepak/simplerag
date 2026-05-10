export interface Document {
  id: string;
  content: string;
  metadata: {
    source: string;
    pageNumber?: number;
  };
}

export interface Chunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
    pageNumber?: number;
  };
}

export interface SearchResult {
  content: string;
  score: number;
  metadata: {
    source: string;
    pageNumber?: number;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
