import { Document } from '@/types';
import { extractText } from 'unpdf';


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
        
      },
    });
  }

  return chunks;
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    const buffer = await file.arrayBuffer();
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    return text;
  }
  
  return await file.text();
}
