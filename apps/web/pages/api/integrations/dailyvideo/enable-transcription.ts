/**
 * @file enable-transcription.ts
 * @description Next.js API route to enable Deepgram-powered live transcription
 * on the Cal.com Daily.co domain. Admin-only. Will be moved to:
 *   apps/web/pages/api/integrations/dailyvideo/enable-transcription.ts
 *
 * Accepts POST requests only. Validates input with Zod. Uses Cal.com's
 * defaultResponder pattern and HttpError for error handling.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import type { TracedRequest } from "@calcom/lib/server/defaultResponder";
import { prisma } from "@calcom/prisma";

/**
 * Zod schema for the request body.
 * deepgramApiKey is optional — if omitted, falls back to DEEPGRAM_API_KEY env var.
 */
const EnableTranscriptionBodySchema = z.object({
  deepgramApiKey: z
    .string()
    .min(1, "deepgramApiKey must be a non-empty string if provided")
    .optional(),
});

/**
 * Zod schema to validate the Daily.co API success response when updating
 * domain-level properties.
 */
const DailyDomainUpdateResponseSchema = z
  .object({
    domain_name: z.string(),
    config: z
      .object({
        enable_transcription: z.unknown().optional(),
      })
      .passthrough(),
  })
  .passthrough();

/**
 * Resolves the Deepgram API key from the request body or environment variable.
 * Throws HttpError if neither source provides a key.
 */
function resolveDeepgramApiKey(bodyKey: string | undefined): string {
  const key = bodyKey ?? process.env.DEEPGRAM_API_KEY;

  if (!key) {
    throw new HttpError({
      statusCode: 400,
      message:
        "No Deepgram API key provided. Either pass deepgramApiKey in the request body or set DEEPGRAM_API_KEY in your environment variables.",
    });
  }

  return key;
}

/**
 * Handler for POST /api/integrations/dailyvideo/enable-transcription
 *
 * 1. Validates method is POST
 * 2. Authenticates via session and verifies ADMIN role
 * 3. Validates request body with Zod
 * 4. Sends domain-level transcription config to Daily.co API
 * 5. Returns success or structured error
 */
async function handler(req: TracedRequest, _res: NextApiResponse) {
  if (req.method !== "POST") {
    throw new HttpError({
      statusCode: 405,
      message: "Only POST requests are allowed on this endpoint.",
    });
  }

  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    throw new HttpError({
      statusCode: 401,
      message: "You must be logged in to access this endpoint.",
    });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user.role !== "ADMIN") {
    throw new HttpError({
      statusCode: 403,
      message: "Only administrators can enable live transcription.",
    });
  }

  const body = EnableTranscriptionBodySchema.parse(req.body);

  const deepgramApiKey = resolveDeepgramApiKey(body.deepgramApiKey);

  const dailyApiKey = process.env.DAILY_API_KEY;

  if (!dailyApiKey) {
    throw new HttpError({
      statusCode: 500,
      message:
        "DAILY_API_KEY is not configured on the server. Contact your system administrator.",
    });
  }

  const dailyResponse = await fetch("https://api.daily.co/v1/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dailyApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        enable_transcription: `deepgram:${deepgramApiKey}`,
      },
    }),
  });

  if (!dailyResponse.ok) {
    const errorText = await dailyResponse.text();
    throw new HttpError({
      statusCode: dailyResponse.status,
      message: `Daily.co API error while enabling transcription: ${errorText}`,
    });
  }

  const json: unknown = await dailyResponse.json();
  const parsed = DailyDomainUpdateResponseSchema.parse(json);

  return {
    message: "Live transcription enabled successfully.",
    domain: parsed.domain_name,
    enableTranscription: parsed.config.enable_transcription,
  };
}

export default defaultResponder(
  handler,
  "/api/integrations/dailyvideo/enable-transcription"
);
