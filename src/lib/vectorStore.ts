import { Document } from '@/types';

interface StoredDoc {
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

class VectorStore {
  private documents: StoredDoc[] = [];

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async initialize(): Promise<void> {}

  async addDocuments(documents: Document[], embeddings: number[][]): Promise<void> {
    this.documents = documents.map((doc, i) => ({
      content: doc.content,
      embedding: embeddings[i],
      metadata: doc.metadata,
    }));
  }

  async similaritySearch(queryEmbedding: number[], k: number = 4) {
    const scored = this.documents.map((doc, i) => ({
      content: doc.content,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding),
      metadata: doc.metadata,
      id: `chunk-${i}`,
    }));

    scored.sort((a, b) => b.score - a.score);
    const topK = scored.slice(0, k);

    return {
      documents: [topK.map((d) => d.content)],
      distances: [topK.map((d) => 1 - d.score)],
      metadatas: [topK.map((d) => d.metadata)],
      ids: [topK.map((d) => d.id)],
    };
  }

  async clear(): Promise<void> {
    this.documents = [];
  }
}

export const vectorStore = new VectorStore();
