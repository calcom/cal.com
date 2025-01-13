import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import prisma from "@calcom/prisma";

import tasker from "..";
import { handleWebhookScheduledTriggers } from "../../webhooks/lib/handleWebhookScheduledTriggers";

async function handler(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Concurrent execution
  await Promise.allSettled([tasker.processQueue(), handleWebhookScheduledTriggers(prisma)]);
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  return await handler(request);
}

export async function POST(request: NextRequest) {
  return await handler(request);
}
