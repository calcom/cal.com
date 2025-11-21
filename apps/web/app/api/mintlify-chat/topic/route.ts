import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { validateMintlifyConfig } from "@calcom/lib/server/mintlifyChatValidation";

/**
 * POST /api/mintlify-chat/topic
 * 
 * Creates a new Mintlify chat topic.
 * This endpoint proxies requests to Mintlify's API while keeping
 * the API key secure on the server side.
 */
export async function POST(_req: NextRequest) {
  try {
    // Validate configuration
    const { apiKey, apiBaseUrl } = validateMintlifyConfig();

    // Make request to Mintlify
    const topicUrl = `${apiBaseUrl}/topic`;
    console.log("[Mintlify Chat Topic] Fetching topic endpoint", { topicUrl });

    const topicResponse = await fetch(topicUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!topicResponse.ok) {
      return NextResponse.json(
        { error: "Failed to create topic" },
        { status: topicResponse.status }
      );
    }

    const topic = await topicResponse.json();

    return NextResponse.json(topic);
  } catch {
    // Return generic error message to avoid leaking internal details
    return NextResponse.json(
      { error: "Failed to create topic. Please try again later." },
      { status: 500 }
    );
  }
}

