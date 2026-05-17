import { NextRequest, NextResponse } from 'next/server';
import { generateSingleEmbedding } from '@/lib/embeddings';
import { similaritySearch } from '@/lib/vectorStore';
import { generateAnswer } from '@/lib/groq';
import { correctiveRAGPipeline } from '@/lib/corrective-rag';

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    const queryEmbedding = await generateSingleEmbedding(question);
    const searchResults = await similaritySearch(queryEmbedding, 5);

    if (searchResults.length === 0) {
      return NextResponse.json({
        answer: 'No relevant information found in the uploaded document. Please upload a document first.',
      });
    }

    const reQueryFn = async (reformulatedQuestion: string) => {
      const newEmbedding = await generateSingleEmbedding(reformulatedQuestion);
      return similaritySearch(newEmbedding, 5);
    };

    const { finalContext, stats } = await correctiveRAGPipeline(
      searchResults,
      question,
      reQueryFn
    );

    if (finalContext.length === 0) {
      return NextResponse.json({
        answer:
          'The retrieved documents do not contain relevant information to answer your question. Please try rephrasing or uploading more relevant documents.',
        correctionStats: stats,
      });
    }

    const answer = await generateAnswer(finalContext, question);

    return NextResponse.json({
      answer,
      sources: finalContext.length,
      correctionStats: stats,
    });
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json({ error: 'Failed to process query' }, { status: 500 });
  }
}
