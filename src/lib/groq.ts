import { generateText } from 'ai';

export async function generateAnswer(context: string[], question: string): Promise<string> {
  const contextString = context.map((ctx, i) => `Document ${i + 1}:\n${ctx}`).join('\n\n');

  const systemPrompt = `You are an AI Assistant who helps resolving the user query based on the available context provided from PDF file with the content and page number.

Rules:
- Only answer based on the available context from the file only.
- If the context doesn't contain enough information to fully answer the question, say so.
- Quote relevant parts from the context when appropriate.
- Be helpful and thorough in your explanation based solely on the provided documents.

Context:
${contextString}`;

  const { text } = await generateText({
    model: 'openai/gpt-5.3-chat',
    system: systemPrompt,
    prompt: question,
    temperature: 0.3,
    
  });

  return text;
}
