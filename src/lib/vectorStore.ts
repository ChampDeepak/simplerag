import { Index } from '@upstash/vector';
import { Document } from '@/types';

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

interface Chunk {
  text: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export async function storeEmbeddings(chunks: Chunk[]): Promise<void> {
  const vectors = chunks.map((chunk, i) => ({
    id: `chunk-${i}-${Date.now()}`,
    vector: chunk.embedding,
    metadata: { text: chunk.text, source: chunk.metadata.source },
  }));

  await index.upsert(vectors);
}

export async function similaritySearch(
  queryEmbedding: number[],
  topK: number = 4
): Promise<{ text: string; score: number }[]> {
  const results = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });

  return results.map((r) => ({
    text: r.metadata?.text as string,
    score: r.score,
  }));
}