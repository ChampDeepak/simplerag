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

export interface CorrectionStats {
  totalEvaluated: number;
  highCount: number;
  ambiguousCount: number;
  lowCount: number;
  correctionApplied: boolean;
  correctionType: 'none' | 'filtered' | 'knowledge_refined' | 'query_reformulated' | 'insufficient_context';
  queryReformulated?: string;
  evaluationTimeMs: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  correctionStats?: CorrectionStats;
}
