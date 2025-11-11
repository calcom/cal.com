import { NextResponse } from "next/server";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { HttpError } from "@calcom/lib/http-error";
import type { RateLimitHelper } from "@calcom/lib/rateLimit";

export class RateLimitExceededError extends Error {
  constructor() {
    super("RATE_LIMIT_EXCEEDED");
  }
}

async function checkRateLimitForNextJs({
  rateLimitingType = "core",
  identifier,
  opts,
}: Pick<RateLimitHelper, "rateLimitingType" | "identifier" | "opts">): Promise<
  { success: true } | { success: false; error: { statusCode: number; message: string } }
> {
  try {
    await checkRateLimitAndThrowError({ rateLimitingType, identifier, opts });
    return { success: true };
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        success: false,
        error: {
          statusCode: error.statusCode,
          message: error.message,
        },
      };
    }
    throw error;
  }
}

export async function handleRateLimitForNextJs(
  identifier: string,
  rateLimitingType: RateLimitHelper["rateLimitingType"] = "core",
  opts?: RateLimitHelper["opts"]
): Promise<NextResponse | null> {
  const rateLimitResult = await checkRateLimitForNextJs({
    rateLimitingType,
    identifier,
    opts,
  });

  if (!rateLimitResult.success) {
    throw new RateLimitExceededError();
  }

  return null;
}
