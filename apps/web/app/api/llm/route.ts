import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import isAuthorized from "@calcom/features/auth/lib/oAuthAuthorization";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["llmRoute"] });

async function handler(req: NextRequest) {
  // Handle POST request data
  let prompt = "";
  let isInternalCall = false;

  if (req.method === "POST") {
    try {
      const body = await req.json();
      prompt = body.prompt || "";
      isInternalCall = body.internal || false;
    } catch (error) {
      return NextResponse.json({ message: "Invalid JSON in request body" }, { status: 400 });
    }
  }

  // Skip OAuth authorization for internal calls
  let account = null;
  if (!isInternalCall) {
    const requiredScopes = ["READ_PROFILE"];
    const token = req.headers.get("authorization")?.split(" ")[1] || "";
    account = await isAuthorized(token, requiredScopes);

    if (!account) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const llmResponse = await llmCall(prompt);

    return NextResponse.json(
      {
        username: account?.name || "Internal User",
        response: llmResponse.response,
        prompt: prompt,
      },
      { status: 200 }
    );
  } catch (error) {
    log.error("Error in LLM route:", error);
    return NextResponse.json({ message: "Failed to generate response" }, { status: 500 });
  }
}

export const GET = defaultResponderForAppDir(handler);
export const POST = defaultResponderForAppDir(handler);

async function llmCall(prompt: string) {
  try {
    const response = await generateOpenAIResponse(prompt);

    console.log("response", response);
    return {
      response,
    };
  } catch (error) {
    log.error("OpenAI failed, using fallback:", error);
    // Fallback to basic response if OpenAI fails
    const fallbackResponse = generateBasicResponse(prompt);
    return {
      response: fallbackResponse,
    };
  }
}

// OpenAI API integration
async function generateOpenAIResponse(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    log.warn("OPENAI_API_KEY not found, using fallback response");
    throw new Error("OpenAI API key not configured");
  }

  const systemPrompt = `You are a professional bio writer. Create a concise, professional bio (2-3 sentences) based on the user's input. Focus on their expertise, experience, and professional interests. Keep it professional but engaging.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Based on this information about me, write a professional bio: ${prompt}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      log.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedBio = data.choices?.[0]?.message?.content?.trim();

    if (!generatedBio) {
      throw new Error("No content generated from OpenAI");
    }

    log.info("Successfully generated bio using OpenAI");
    return generatedBio;
  } catch (error) {
    log.error("Failed to call OpenAI API:", error);
    throw error;
  }
}

// Basic response generator - fallback when OpenAI is not available
function generateBasicResponse(prompt: string): string {
  const bioTemplates = [
    `I'm a passionate professional with a strong background in ${extractKeywords(
      prompt
    )}. I thrive on solving complex challenges and collaborating with diverse teams to deliver innovative solutions. With a commitment to continuous learning and excellence, I bring both technical expertise and creative problem-solving to every project I undertake.`,

    `As an experienced professional specializing in ${extractKeywords(
      prompt
    )}, I'm dedicated to driving meaningful impact through technology and innovation. I enjoy building robust solutions that make a real difference, and I'm always excited to tackle new challenges that push the boundaries of what's possible.`,

    `With expertise in ${extractKeywords(
      prompt
    )}, I combine technical skills with strategic thinking to create solutions that matter. I'm passionate about staying at the forefront of industry trends and love collaborating with teams that share a vision for excellence and innovation.`,

    `I'm a results-driven professional with deep experience in ${extractKeywords(
      prompt
    )}. I believe in the power of technology to transform ideas into reality, and I'm committed to delivering high-quality work that exceeds expectations. I enjoy mentoring others and contributing to projects that have lasting impact.`,
  ];

  return bioTemplates[Math.floor(Math.random() * bioTemplates.length)];
}

// Helper function to extract key terms from the user's prompt
function extractKeywords(prompt: string): string {
  // Simple keyword extraction - could be enhanced with better NLP
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

  // Take up to 3 meaningful words
  const keywords = words.slice(0, 3).join(", ");
  return keywords || "technology and innovation";
}
