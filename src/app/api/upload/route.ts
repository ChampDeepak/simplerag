import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile, chunkText } from '@/lib/chunking';
import { generateEmbeddings } from '@/lib/embeddings';
import { storeEmbeddings } from '@/lib/vectorStore';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('Processing file:', file.name, file.type);
    
    const text = await extractTextFromFile(file);
    console.log('Extracted text length:', text.length);
    
    const chunks = chunkText(text, 500, 50);
    console.log('Created chunks:', chunks.length);
    
    const embeddings = await generateEmbeddings(chunks.map(c => c.content));
    console.log('Generated embeddings:', embeddings.length);
    
    const chunkData = chunks.map((chunk, i) => ({
      text: chunk.content,
      embedding: embeddings[i],
      metadata: { source: file.name },
    }));
    
    await storeEmbeddings(chunkData);

    return NextResponse.json({ 
      success: true, 
      chunkCount: chunks.length,
      message: `Successfully processed ${file.name} into ${chunks.length} chunks`
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: `Failed to process file: ${error}` }, { status: 500 });
  }
}
