import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ragConfigs, ragContent } from "@/lib/db/schema/ragContent";
import { generateEmbedding } from "@/lib/ai/embedding";

// Function to clean and chunk tweets
function processTweetContent(content: string): string[] {
  // Split content into separate tweets (assuming numbered format: 1. tweet\n2. tweet)
  const tweets = content
    .split(/\d+\.\s+/)
    .filter((tweet) => tweet.trim())
    .map((tweet) => tweet.trim());

  // Remove URLs, @mentions, and extra whitespace
  return tweets.map((tweet) =>
    tweet
      .replace(/https?:\/\/\S+/g, "")
      .replace(/@\w+/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export async function POST(req: Request) {
  try {
    // Parse form data
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const urlPath = formData.get("urlPath") as string;
    const file = formData.get("file") as File;

    // Validate inputs
    if (!name || !urlPath || !file) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate URL path format
    const urlRegex = /^[a-zA-Z0-9-_]+$/;
    if (!urlRegex.test(urlPath)) {
      return NextResponse.json(
        { 
          error: "Invalid URL path format. Use only letters, numbers, hyphens, and underscores" 
        },
        { status: 400 }
      );
    }

    // Check if URL path is already in use
    const existingConfig = await db.query.ragConfigs.findFirst({
      where: eq(ragConfigs.urlPath, urlPath)
    });

    if (existingConfig) {
      return NextResponse.json(
        { error: "URL path already in use" },
        { status: 400 }
      );
    }

    // Create RAG configuration
    const [config] = await db
      .insert(ragConfigs)
      .values({
        id: crypto.randomUUID(),
        name,
        urlPath,
        isActive: true
      })
      .returning();

    // Process content file
    const fileContent = await file.text();
    const tweets = processTweetContent(fileContent);

    // Generate embeddings and store tweets
    for (const tweet of tweets) {
      const embedding = await generateEmbedding(tweet);

      await db.insert(ragContent).values({
        id: crypto.randomUUID(),
        ragId: config.id,
        content: tweet,
        embedding,
        metadata: { type: "tweet" }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Twitter RAG created successfully",
      url: \`/tweet-generator/\${urlPath}\`
    });

  } catch (error) {
    console.error("Error creating Twitter RAG:", error);
    return NextResponse.json(
      { error: "Failed to create Twitter RAG" },
      { status: 500 }
    );
  }
}