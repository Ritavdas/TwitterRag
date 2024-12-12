import {
  pgTable,
  uuid,
  varchar,
  text,
  json,
  timestamp,
  boolean,
  pgEnum
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vector } from "pgvector/drizzle-orm";

// Enum for content types
export const contentTypeEnum = pgEnum("content_type", [
  "tweet",
  "thread",
  "article",
  "custom"
]);

// RAG configuration table
export const ragConfigs = pgTable("rag_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  urlPath: varchar("url_path", { length: 255 }).notNull().unique(),
  systemPrompt: text("system_prompt"),
  perplexityPrompt: text("perplexity_prompt"),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// RAG content table with vector embeddings
export const ragContent = pgTable("rag_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  ragId: uuid("rag_id")
    .references(() => ragConfigs.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  contentType: contentTypeEnum("content_type").default("tweet"),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  metadata: json("metadata").$type<{
    type: string;
    source?: string;
    timestamp?: string;
    author?: string;
    engagement?: {
      likes?: number;
      retweets?: number;
      replies?: number;
    };
    context?: Record<string, any>;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Helper types
export type RagConfig = typeof ragConfigs.$inferSelect;
export type NewRagConfig = typeof ragConfigs.$inferInsert;

export type RagContent = typeof ragContent.$inferSelect;
export type NewRagContent = typeof ragContent.$inferInsert;

// Indexes (to be created in migrations)
/*
CREATE INDEX idx_rag_content_rag_id ON rag_content(rag_id);
CREATE INDEX idx_embedding_cosine ON rag_content USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
*/

// Example query helpers
export const findSimilarContent = (embedding: number[], limit: number = 5) => {
  return sql`
    SELECT content, 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) AS similarity
    FROM ${ragContent}
    ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
    LIMIT ${limit}
  `;
};

export const getContentByRagId = (ragId: string) => {
  return sql`
    SELECT * FROM ${ragContent}
    WHERE rag_id = ${ragId}
    ORDER BY created_at DESC
  `;
};
