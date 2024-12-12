"use client";

import TwitterAgentInterface from "@/components/TwitterAgentInterface";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tweet Screenshot Analyzer",
  description: "Analyze tweet screenshots for context and insights"
};

export default function TweetAnalysisPage() {
  return <TwitterAgentInterface />;
}
