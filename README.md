# Document Q&A Assistant (Google NotebookLM Clone)

A **Corrective RAG (CRAG)** powered application that lets users upload documents (PDF or text) and have grounded conversations with them. Instead of trusting top-k retrieval blindly, the system has an LLM judge inspect every retrieved chunk, filter out noise, refine partial hits, and reformulate the query when retrieval fails — producing answers that are both more accurate and more honest about uncertainty.

## Features

- Upload PDF or plain text documents
- Automatic chunking of documents for efficient retrieval
- Semantic search using embeddings
- **Corrective RAG pipeline** — LLM-as-judge evaluates retrieval quality and self-corrects
- Per-answer correction stats surfaced to the UI (HIGH/AMBIGUOUS/LOW counts, correction type, reformulated query)
- Q&A interaction powered by an LLM via Vercel AI Gateway
- Answers grounded in document content (no hallucinations)

## Architecture

### Corrective RAG Pipeline

```
Upload → Extract → Chunk → Embed → Vector Store
                                       │
                                       ▼
Question ─► Embed ─► Retrieve Top-K ─► LLM Judge ─► Triage
                                                     │
                       ┌─────────────────────────────┼─────────────────────────────┐
                       ▼                             ▼                             ▼
                    HIGH                       AMBIGUOUS                          LOW
              (use as-is)              (knowledge refinement)         (reformulate + re-retrieve)
                       │                             │                             │
                       └─────────────────────────────┼─────────────────────────────┘
                                                     ▼
                                              Final Context → Generation
```

1. **Ingestion**: User uploads PDF or TXT file
2. **Text Extraction**: Parse document text using unpdf
3. **Chunking**: Split text into semantically coherent chunks
4. **Embedding**: Generate vector embeddings using OpenAI text-embedding-3-small via Vercel AI Gateway
5. **Storage**: Store embeddings in Upstash Vector (hosted vector database)
6. **Retrieval**: Find top-k relevant chunks using similarity search
7. **Corrective Layer (CRAG)**: Judge each chunk's relevance and self-correct retrieval (see below)
8. **Generation**: Generate answer using Vercel AI SDK with the corrected context

## Corrective RAG (CRAG)

Vanilla RAG silently hands the LLM whatever the vector store returned — even if those chunks are off-topic or only tangentially related. CRAG adds a lightweight evaluation-and-correction step between retrieval and generation so the model only ever sees high-signal context.

### Pipeline Stages

Implemented in [`src/lib/corrective-rag.ts`](src/lib/corrective-rag.ts):

1. **Retrieve** — `similaritySearch` returns the top-5 chunks from Upstash Vector.
2. **Evaluate (LLM-as-Judge)** — `evaluateDocumentsBatch` sends all chunks to a small judge model (`meta-llama/llama-3.1-8b-instruct` via OpenRouter) in a single batched call. Each chunk is labeled:
   - **HIGH** (0.7–1.0) — directly answers the question
   - **AMBIGUOUS** (0.3–0.7) — partially relevant
   - **LOW** (0.0–0.3) — not relevant
3. **Triage & Correct** — based on the label distribution, one of four actions is taken:
   | Situation | Action | `correctionType` |
   |-----------|--------|------------------|
   | At least one HIGH chunk | Use HIGH chunks directly | `none` or `filtered` |
   | AMBIGUOUS chunks present | Run **knowledge refinement** — judge extracts only the relevant strips, preserving exact wording | `knowledge_refined` |
   | All chunks LOW | **Reformulate the query** into a more specific, document-searchable form and re-retrieve | `query_reformulated` |
   | Reformulation still fails | Refuse to answer rather than hallucinate | `insufficient_context` |
4. **Generate** — only the corrected context is passed to the answer-generation LLM.

### Why this matters

- **Fewer hallucinations** — LOW chunks never make it to the generator.
- **Higher precision** — knowledge refinement trims AMBIGUOUS chunks down to just the relevant sentences, cutting noise tokens.
- **Self-healing retrieval** — when the user's phrasing doesn't match the document, query reformulation gets a second shot before giving up.
- **Honest failure** — `insufficient_context` returns a "no answer" response instead of a confident guess.
- **Observable** — every response carries a `correctionStats` payload (counts, action taken, evaluation time, reformulated query) so the UI can show *what the system did to your retrieval*.

### Correction Stats Shape

```ts
interface CorrectionStats {
  totalEvaluated: number;
  highCount: number;
  ambiguousCount: number;
  lowCount: number;
  correctionApplied: boolean;
  correctionType: 'none' | 'filtered' | 'knowledge_refined' | 'query_reformulated' | 'insufficient_context';
  queryReformulated?: string;
  evaluationTimeMs: number;
}
```

## Tech Stack

| Layer | Technology |
|-------|-------------|
| **Framework** | Next.js 16 with TypeScript |
| **UI** | React 19, Tailwind CSS 4 |
| **PDF Parsing** | unpdf |
| **Embeddings** | OpenAI text-embedding-3-small via Vercel AI Gateway |
| **Vector Store** | Upstash Vector (hosted) |
| **Answer LLM** | Vercel AI Gateway (openai/gpt-5.3-chat) via Vercel AI SDK |
| **CRAG Judge LLM** | meta-llama/llama-3.1-8b-instruct via OpenRouter |

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
# Vercel AI Gateway (embeddings + answer-generation LLM)
AI_GATEWAY_API_KEY=your_api_key_here

# Upstash Vector (hosted vector database)
UPSTASH_VECTOR_REST_URL=your_upstash_vector_url
UPSTASH_VECTOR_REST_TOKEN=your_upstash_vector_token

# OpenRouter (CRAG judge model — relevance evaluation, knowledge refinement, query reformulation)
OPENROUTER_API_KEY=your_openrouter_api_key
```

Set up a Vercel AI Gateway at [vercel.com/dashboard](https://vercel.com/dashboard) to proxy OpenAI requests, and grab an OpenRouter key at [openrouter.ai/keys](https://openrouter.ai/keys) for the CRAG judge.

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
  "sources": 4,
  "correctionStats": {
    "totalEvaluated": 5,
    "highCount": 2,
    "ambiguousCount": 2,
    "lowCount": 1,
    "correctionApplied": true,
    "correctionType": "knowledge_refined",
    "evaluationTimeMs": 842
  }
}
```

When retrieval completely misses, the response also includes `correctionStats.queryReformulated` with the LLM's rewritten query, and `correctionType` will be `query_reformulated` or `insufficient_context`.

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
│   │   ├── corrective-rag.ts      # CRAG: judge, refine, reformulate
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
- [ ] Web-search fallback when CRAG returns `insufficient_context`
- [ ] Cache judge evaluations per (chunk, question) pair to cut latency
- [ ] Tunable HIGH/AMBIGUOUS/LOW thresholds via env vars
