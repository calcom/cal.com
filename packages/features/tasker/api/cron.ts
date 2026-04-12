import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import process from "node:process";

import { TaskProcessor } from "../task-processor";

async function handler(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const apiKey = request.nextUrl.searchParams.get("apiKey");

  const isAuthorized =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    authHeader === `Bearer ${process.env.CRON_API_KEY}` ||
    apiKey === process.env.CRON_API_KEY ||
    apiKey === process.env.CRON_SECRET;

  if (!isAuthorized) {
    return new Response("Unauthorized", { status: 401 });
  }
  const taskProcessor = new TaskProcessor();
  await taskProcessor.processQueue();
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  return await handler(request);
}

export async function POST(request: NextRequest) {
  return await handler(request);
}
