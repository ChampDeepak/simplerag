import OpenAI from 'openai';
import { CorrectionStats } from '@/types';

const JUDGE_MODEL = 'meta-llama/llama-3.1-8b-instruct';

function getOpenRouterClient() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });
}

type RelevanceLabel = 'HIGH' | 'AMBIGUOUS' | 'LOW';

async function evaluateDocumentsBatch(
  documents: string[],
  question: string
): Promise<{ label: RelevanceLabel; score: number }[]> {
  const openrouter = getOpenRouterClient();
  const docsFormatted = documents
    .map((d, i) => `Document ${i + 1}:\n${d.substring(0, 800)}`)
    .join('\n\n---\n\n');

  const response = await openrouter.chat.completions.create({
    model: JUDGE_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a document relevance evaluator. Return ONLY a JSON object with key "evaluations" containing an array of objects with "label" (HIGH|AMBIGUOUS|LOW) and "score" (0.0-1.0). No explanation.\n\nHIGH = directly answers question (score 0.7-1.0)\nAMBIGUOUS = partially relevant (score 0.3-0.7)\nLOW = not relevant (score 0.0-0.3)',
      },
      {
        role: 'user',
        content: `Question: ${question}\n\n${docsFormatted}\n\nReturn {"evaluations": [{"label": "...", "score": 0.0}, ...]} for all ${documents.length} documents.`,
      },
    ],
    temperature: 0.1,
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content || '';

  try {
    const objMatch = content.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const parsed = JSON.parse(objMatch[0]);
      const evals: { label: string; score: number }[] = parsed.evaluations ?? parsed;
      if (Array.isArray(evals) && evals.length > 0) {
        return documents.map((_, i) => ({
          label: (['HIGH', 'AMBIGUOUS', 'LOW'].includes(evals[i]?.label)
            ? evals[i].label
            : 'AMBIGUOUS') as RelevanceLabel,
          score: typeof evals[i]?.score === 'number' ? evals[i].score : 0.5,
        }));
      }
    }
  } catch {
    // fallthrough to default
  }

  return documents.map(() => ({ label: 'AMBIGUOUS' as RelevanceLabel, score: 0.5 }));
}

async function refineKnowledgeBatch(
  documents: string[],
  question: string
): Promise<string[]> {
  const openrouter = getOpenRouterClient();
  return Promise.all(
    documents.map(async (doc) => {
      const response = await openrouter.chat.completions.create({
        model: JUDGE_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Extract only the portions of the document that help answer the question. Preserve exact wording. Be concise.',
          },
          { role: 'user', content: `Question: ${question}\n\nDocument:\n${doc}` },
        ],
        temperature: 0.1,
        max_tokens: 500,
      });
      return response.choices[0]?.message?.content?.trim() || doc;
    })
  );
}

async function reformulateQuery(question: string): Promise<string> {
  const openrouter = getOpenRouterClient();
  const response = await openrouter.chat.completions.create({
    model: JUDGE_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Reformulate the question to be more specific and searchable in a document. Return only the reformulated question, nothing else.',
      },
      { role: 'user', content: question },
    ],
    temperature: 0.3,
    max_tokens: 100,
  });
  return response.choices[0]?.message?.content?.trim() || question;
}

export async function correctiveRAGPipeline(
  retrievedDocs: { text: string; score: number }[],
  question: string,
  reQueryFn: (q: string) => Promise<{ text: string; score: number }[]>
): Promise<{ finalContext: string[]; stats: CorrectionStats }> {
  const startTime = Date.now();

  // Step 1: LLM-as-judge evaluates all retrieved chunks
  const evaluationResults = await evaluateDocumentsBatch(
    retrievedDocs.map((d) => d.text),
    question
  );

  const labeled = retrievedDocs.map((doc, i) => ({
    ...doc,
    label: evaluationResults[i]?.label ?? 'AMBIGUOUS',
    relevanceScore: evaluationResults[i]?.score ?? 0.5,
  }));

  const highDocs = labeled.filter((d) => d.label === 'HIGH');
  const ambiguousDocs = labeled.filter((d) => d.label === 'AMBIGUOUS');
  const lowDocs = labeled.filter((d) => d.label === 'LOW');

  let finalContext: string[] = [];
  let correctionApplied = false;
  let correctionType: CorrectionStats['correctionType'] = 'none';
  let queryReformulated: string | undefined;

  // Step 2: HIGH docs go in directly
  finalContext.push(...highDocs.map((d) => d.text));

  // Step 3: Refine AMBIGUOUS docs — extract only the relevant knowledge strips
  if (ambiguousDocs.length > 0) {
    const refined = await refineKnowledgeBatch(
      ambiguousDocs.map((d) => d.text),
      question
    );
    finalContext.push(...refined);
    correctionApplied = true;
    correctionType = 'knowledge_refined';
  }

  // Step 4: All docs are LOW — trigger query reformulation + re-retrieval
  if (highDocs.length === 0 && ambiguousDocs.length === 0) {
    correctionApplied = true;
    const reformulated = await reformulateQuery(question);
    queryReformulated = reformulated;

    const newDocs = await reQueryFn(reformulated);
    if (newDocs.length > 0) {
      const newEvals = await evaluateDocumentsBatch(
        newDocs.map((d) => d.text),
        question
      );
      const relevant = newDocs.filter((_, i) => newEvals[i]?.label !== 'LOW');
      if (relevant.length > 0) {
        finalContext.push(...relevant.map((d) => d.text));
        correctionType = 'query_reformulated';
      } else {
        correctionType = 'insufficient_context';
      }
    } else {
      correctionType = 'insufficient_context';
    }
  }

  // Mark as corrected even if only LOW docs were filtered (context is effectively corrected)
  if (!correctionApplied && lowDocs.length > 0) {
    correctionApplied = true;
    correctionType = 'filtered';
  }

  return {
    finalContext,
    stats: {
      totalEvaluated: labeled.length,
      highCount: highDocs.length,
      ambiguousCount: ambiguousDocs.length,
      lowCount: lowDocs.length,
      correctionApplied,
      correctionType,
      queryReformulated,
      evaluationTimeMs: Date.now() - startTime,
    },
  };
}
