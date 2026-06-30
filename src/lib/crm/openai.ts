import OpenAI from "openai";
import { env } from "@/lib/env";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (!env.openAiApiKey) return null;
  if (!client) client = new OpenAI({ apiKey: env.openAiApiKey });
  return client;
}

export async function createEmbedding(input: string): Promise<number[] | null> {
  const openai = getOpenAIClient();
  if (!openai) return null;
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  return response.data[0]?.embedding ?? null;
}

export async function createChatCompletion(system: string, user: string): Promise<string | null> {
  const openai = getOpenAIClient();
  if (!openai) return null;
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return response.choices[0]?.message?.content ?? null;
}
