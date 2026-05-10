import { Document } from '@/types';
import fs from 'node:fs';
import path from 'node:path';

export function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): Document[] {
  const chunks: Document[] = [];
  
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        id: `chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          source: 'uploaded-document'
        },
      });
      chunkIndex++;
      
      const words = currentChunk.split(' ');
      const overlapText = words.slice(-Math.floor(overlap / 5)).join(' ');
      currentChunk = overlapText + ' ' + sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `chunk-${chunkIndex}`,
      content: currentChunk.trim(),
      metadata: {
        source: 'uploaded-document',
        chunkIndex,
      },
    });
  }

  return chunks;
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    const tempPath = path.join('/tmp', `${Date.now()}-${file.name}`);
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(buffer));
    
    try {
      const { LiteParse } = await import('@llamaindex/liteparse');
      const parser = new LiteParse();
      const result = await parser.parse(tempPath);
      const text = result.text;
      return text;
    } finally {
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    }
  }
  
  return await file.text();
}
