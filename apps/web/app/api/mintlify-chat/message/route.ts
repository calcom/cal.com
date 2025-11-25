import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  validateChatMessage,
  validateMintlifyConfig,
  sanitizeResponseHeaders,
} from "@calcom/lib/server/mintlifyChatValidation";

/**
 * POST /api/mintlify-chat/message
 * 
 * Sends a message to a Mintlify chat topic and streams the response.
 * This endpoint proxies requests to Mintlify's API while:
 * - Keeping the API key secure on the server side
 * - Validating and sanitizing user input
 * - Preventing malicious payloads
 * 
 * Expected body:
 * {
 *   message: string,
 *   topicId: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Validate configuration
    const { apiKey, apiBaseUrl } = validateMintlifyConfig();

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Validate and sanitize the message payload
    let message: string;
    let topicId: string;
    
    try {
      const validated = validateChatMessage(body);
      message = validated.message;
      topicId = validated.topicId;
    } catch (validationError) {
      // For validation errors, return detailed message with 400
      if (validationError instanceof Error) {
        return NextResponse.json(
          { error: validationError.message },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    // Make request to Mintlify
    const messageUrl = `${apiBaseUrl}/message`;
    console.log("[Mintlify Chat Message] Fetching message endpoint", { messageUrl, topicId });

    const queryResponse = await fetch(messageUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ message, topicId }),
    });

    if (!queryResponse.ok) {
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: queryResponse.status }
      );
    }

    if (!queryResponse.body) {
      return NextResponse.json(
        { error: "No response body from Mintlify" },
        { status: 500 }
      );
    }

    // Sanitize response headers before forwarding
    const sanitizedHeaders = sanitizeResponseHeaders(queryResponse.headers);

    // Stream the response back to the client
    // We need to pipe the ReadableStream from Mintlify directly to the client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = queryResponse.body!.getReader();
        
        try {
          for (;;) {
            const { done, value } = await reader.read();
            
            if (done) {
              controller.close();
              break;
            }
            
            controller.enqueue(value);
          }
        } catch (error) {
          console.error("[Mintlify Chat Message Stream]", error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        ...sanitizedHeaders,
      },
    });
  } catch {
    // Return generic error message to avoid leaking internal details
    // Validation errors are already handled above with specific messages
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}

