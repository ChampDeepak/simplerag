# Document Q&A Assistant (Google NotebookLM Clone)

A RAG-powered application that allows users to upload documents (PDF or text) and have conversations with them. The system processes documents, stores embeddings in a vector database, and generates answers grounded in the document content.

## Features

- Upload PDF or plain text documents
- Automatic chunking of documents for efficient retrieval
- Semantic search using embeddings
- Q&A interaction powered by Groq LLM
- Answers grounded in document content (no hallucinations)

## Architecture

### RAG Pipeline

```
Document Upload → Text Extraction → Chunking → Embedding → Vector Storage → Retrieval → Generation
```

1. **Ingestion**: User uploads PDF or TXT file
2. **Text Extraction**: Parse document text using unpdf
3. **Chunking**: Split text into semantically coherent chunks
4. **Embedding**: Generate vector embeddings using OpenAI text-embedding-3-small via Vercel AI Gateway
5. **Storage**: Store embeddings in Upstash Vector (hosted vector database)
6. **Retrieval**: Find relevant chunks using similarity search
7. **Generation**: Generate answer using Vercel AI SDK with retrieved context

## Tech Stack

| Layer | Technology |
|-------|-------------|
| **Framework** | Next.js 16 with TypeScript |
| **UI** | React 19, Tailwind CSS 4 |
| **PDF Parsing** | unpdf |
| **Embeddings** | OpenAI text-embedding-3-small via Vercel AI Gateway |
| **Vector Store** | Upstash Vector (hosted) |
| **LLM Provider** | Vercel AI Gateway |
| **LLM SDK** | Vercel AI SDK |
| **LLM Model** | openai/gpt-5.3-chat |

## Chunking Strategy

This application uses a **Sentence-based Chunking with Overlap** strategy:

### Parameters
- **Chunk Size**: 500 characters (configurable)
- **Overlap**: 50 characters between consecutive chunks
- **Separator**: Sentence-ending punctuation followed by whitespace (`(?<=[.!?])\s+`)

### How It Works

1. **Sentence Splitting**: Text is split at sentence boundaries (., !, ?)
2. **Building Chunks**: Sentences are accumulated until chunk size limit is reached
3. **Overlap**: Last few words of the previous chunk are carried over to maintain context continuity
4. **Final Chunk**: Any remaining text is saved as the final chunk

### Why This Strategy?

- **Context Preservation**: Overlapping chunks ensure no information is lost at boundaries
- **Semantic Coherence**: Chunks align with sentence boundaries for natural meaning
- **Efficient Retrieval**: Moderate chunk size balances relevance and context
- **Configurable**: Easy to adjust chunk size based on document type

## Setup

### Prerequisites

1. Node.js 18+ installed
2. Vercel AI Gateway configured

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd rag-app

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Vercel AI Gateway credentials

# Run the development server
npm run dev
```

### Environment Variables

Create a `.env.local` file:

```env
# Vercel AI Gateway (for embeddings and LLM)
AI_GATEWAY_API_KEY=your_api_key_here

# Upstash Vector (hosted vector database)
UPSTASH_VECTOR_REST_URL=your_upstash_vector_url
UPSTASH_VECTOR_REST_TOKEN=your_upstash_vector_token
```

Set up a Vercel AI Gateway at [vercel.com/dashboard](https://vercel.com/dashboard) to proxy OpenAI requests.

## Usage

1. Open http://localhost:3000
2. Upload a PDF or text document via drag-and-drop or file picker
3. Wait for processing to complete (text extraction → chunking → embedding)
4. Ask questions about the document in the chat interface
5. Get answers grounded in the document content

## API Endpoints

### POST /api/upload
Upload and process a document.

**Request**: `multipart/form-data` with `file` field

**Response**:
```json
{
  "success": true,
  "chunkCount": 79,
  "message": "Successfully processed document.pdf into 79 chunks"
}
```

### POST /api/query
Ask a question about the uploaded document.

**Request**:
```json
{
  "question": "What is the main topic of this document?"
}
```

**Response**:
```json
{
  "answer": "Based on the document, the main topic is...",
  "sources": 4
}
```

## Project Structure

```
rag-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/route.ts    # Document upload endpoint
│   │   │   └── query/route.ts     # Q&A endpoint
│   │   └── page.tsx               # Main UI
│   ├── components/
│   │   ├── UploadSection.tsx      # File upload component
│   │   └── ChatSection.tsx       # Chat interface
│   ├── lib/
│   │   ├── chunking.ts            # Document parsing & chunking
│   │   ├── embeddings.ts          # OpenAI embedding via Vercel AI Gateway
│   │   ├── vectorStore.ts         # Upstash Vector (hosted)
│   │   └── groq.ts                # LLM generation (Vercel AI SDK)
│   └── types/
│       └── index.ts               # TypeScript interfaces
├── .env.local                     # Environment variables
├── next.config.ts                # Next.js configuration
├── package.json
└── README.md
```

## Future Improvements

- [ ] Support for more document formats (DOCX, HTML)
- [ ] Persistent vector storage (ChromaDB, Pinecone)
- [ ] Multiple document storage and querying
- [ ] Streaming responses for better UX
- [ ] Conversation history
- [ ] Citation highlighting
- [ ] Dark mode support
