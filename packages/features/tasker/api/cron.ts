import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { scheduleDebouncedSeatBilling } from "@calcom/features/ee/teams/lib/payments";

import tasker from "..";

async function handler(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  await tasker.processQueue();

  try {
    await scheduleDebouncedSeatBilling();
  } catch (error) {
    console.error("Failed to schedule debounced seat billing:", error);
  }

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  return await handler(request);
}

export async function POST(request: NextRequest) {
  return await handler(request);
}
