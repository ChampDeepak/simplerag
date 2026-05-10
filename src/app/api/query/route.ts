import { NextRequest, NextResponse } from 'next/server';
import { generateSingleEmbedding } from '@/lib/embeddings';
import { similaritySearch } from '@/lib/vectorStore';
import { generateAnswer } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();
    
    if (!question) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    const queryEmbedding = await generateSingleEmbedding(question);
    
    const searchResults = await similaritySearch(queryEmbedding, 4);
    
    const contexts = searchResults.map((r) => r.text);
    
    if (contexts.length === 0) {
      return NextResponse.json({ 
        answer: 'No relevant information found in the uploaded document. Please upload a document first.' 
      });
    }

    const answer = await generateAnswer(contexts, question);

    return NextResponse.json({ 
      answer,
      sources: contexts.length
    });
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json({ error: 'Failed to process query' }, { status: 500 });
  }
}
