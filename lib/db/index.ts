import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/ragContent";
import { getEnvVar } from "@/lib/utils";

// Get database URL from environment
const connectionString = getEnvVar("DATABASE_URL");

// Create postgres connection
const client = postgres(connectionString, {
  max: 1,
  prepare: false,
});

// Initialize drizzle with all schemas
export const db = drizzle(client, { schema });

// Utility function to check database connection
export async function checkDatabaseConnection() {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error("Database connection error:", error);
    return false;
  }
}

// Helper function for vector similarity search
export async function findSimilarContent(
  embedding: number[],
  limit: number = 5,
  threshold: number = 0.7
) {
  const result = await db.execute(sql`
    SELECT 
      content,
      1 - (embedding <=> ${JSON.stringify(embedding)}::vector) AS similarity
    FROM rag_content
    WHERE 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) > ${threshold}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `);
  
  return result;
}

// Helper function to get RAG configuration
export async function getRagConfig(urlPath: string) {
  const config = await db.query.ragConfigs.findFirst({
    where: eq(schema.ragConfigs.urlPath, urlPath),
  });
  
  return config;
}

// Helper function to create new RAG content
export async function createRagContent(
  ragId: string,
  content: string,
  embedding: number[],
  metadata?: Record<string, any>
) {
  const [newContent] = await db
    .insert(schema.ragContent)
    .values({
      ragId,
      content,
      embedding,
      metadata,
    })
    .returning();
    
  return newContent;
}

// Type exports
export type { RagConfig, RagContent } from "./schema/ragContent";