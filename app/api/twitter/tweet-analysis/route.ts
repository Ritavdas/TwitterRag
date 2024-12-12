import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const model = openai("gpt-4-vision-preview");
const miniModel = openai("gpt-4");

const REFINEMENT_PROMPT = `
Given a tweet's content, transform it into a clear, focused web search request.
Extract the key topics, entities, and claims that need verification or context.
Format it as a concise, search-engine-friendly query.

Tweet content: {tweet}

Output only the refined search query without any additional text or explanations.`;

const ANALYSIS_PROMPT = `
When analyzing a tweet, focus on:
1. Context & Background: What's the broader context or story behind this tweet?
2. Fact Verification: Are there any claims that need verification?
3. Key Players: Who are the main entities mentioned and what's their relevance?
4. Related Events: What recent events or developments are connected to this?
5. Expert Insights: What do experts or reliable sources say about this topic?

Format the information clearly and concisely, focusing on providing valuable insights
that help understand the full picture behind the tweet.`;

export async function POST(req: Request) {
	try {
		// Get the form data
		const formData = await req.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return NextResponse.json(
				{ error: "No file provided" },
				{ status: 400 }
			);
		}

		// Convert file to base64
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		const base64Image = buffer.toString("base64");

		// 1. Extract text from image using GPT-4 Vision
		const { text: tweetText } = await generateText({
			model: model,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: "Read the tweet from this image and extract its text content. Only return the tweet text, nothing else.",
						},
						{
							type: "image",
							image: base64Image,
						},
					],
				},
			],
		});

		// 2. Refine the query
		const { text: refinedQuery } = await generateText({
			model: miniModel,
			prompt: REFINEMENT_PROMPT.replace("{tweet}", tweetText),
		});

		// 3. Generate analysis
		const { text: analysis } = await generateText({
			model: miniModel,
			messages: [
				{
					role: "system",
					content: ANALYSIS_PROMPT,
				},
				{
					role: "user",
					content: refinedQuery,
				},
			],
		});

		return NextResponse.json({
			success: true,
			tweetText,
			refinedQuery,
			analysis,
		});
	} catch (error) {
		console.error("Tweet analysis error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to analyze tweet",
			},
			{ status: 500 }
		);
	}
}
