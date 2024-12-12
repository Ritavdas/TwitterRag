import { OpenAI } from "openai";
import { getEnvVar } from "@/lib/utils";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: getEnvVar("OPENAI_API_KEY"),
});

/**
 * Generate embeddings for given text using OpenAI's text-embedding-3-large model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: texts,
      encoding_format: "float",
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error("Error generating embeddings in batch:", error);
    throw new Error("Failed to generate embeddings");
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find most similar embeddings from a list
 */
export function findSimilarEmbeddings(
  queryEmbedding: number[],
  embeddings: number[][],
  topK: number = 5
): { index: number; similarity: number }[] {
  const similarities = embeddings.map((emb, index) => ({
    index,
    similarity: cosineSimilarity(queryEmbedding, emb),
  }));

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Process and clean text before generating embeddings
 */
export function preprocessText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")        // normalize whitespace
    .replace(/[^\w\s.,!?-]/g, "") // remove special characters
    .toLowerCase();
}

/**
 * Chunk text into smaller pieces for embedding
 */
export function chunkText(text: string, maxChunkSize: number = 8000): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;

  for (const word of words) {
    if (currentSize + word.length > maxChunkSize) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [word];
      currentSize = word.length;
    } else {
      currentChunk.push(word);
      currentSize += word.length + 1; // +1 for space
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}