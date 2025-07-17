// eslint-disable-next-line no-restricted-imports
import type { GetServerSidePropsContext, NextApiResponse } from "next";

import logger from "@calcom/lib/logger";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { type TLlmInputSchema } from "./llm.schema";

const log = logger.getSubLogger({ prefix: ["llmHandler"] });

type LlmOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
  };
  input: TLlmInputSchema;
};

export const llmHandler = async ({ ctx, input }: LlmOptions) => {
  const { user } = ctx;
  const { prompt } = input;

  log.info(`LLM request from user ${user.id} with prompt: ${prompt}`);

  try {
    // Call the internal LLM API route
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/llm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // For internal calls, we can use a service token or skip auth
        // For now, let's create a simple internal call
      },
      body: JSON.stringify({
        prompt,
        internal: true, // Flag to indicate this is an internal call
      }),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      response: data.response,
    };
  } catch (error) {
    log.error("Error calling internal LLM API:", error);
    // Fallback response for when API fails
    return {
      response: generateFallbackResponse(prompt),
    };
  }
};

// Simple fallback response generator
function generateFallbackResponse(prompt: string): string {
  return `I'm a passionate professional focused on ${extractKeywords(
    prompt
  )}. I enjoy tackling challenging projects and collaborating with teams to deliver innovative solutions.`;
}

// Helper function to extract key terms from the user's prompt
function extractKeywords(prompt: string): string {
  const commonWords = [
    "i",
    "am",
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "up",
    "about",
    "into",
    "over",
    "after",
  ];
  const words = prompt
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !commonWords.includes(word));

  // Take up to 2 meaningful words for fallback
  const keywords = words.slice(0, 2).join(" and ");
  return keywords || "technology";
}
