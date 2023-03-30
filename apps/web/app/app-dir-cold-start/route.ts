import cache from "memory-cache";
import { NextResponse } from "next/server";

export async function GET() {
  const cacheKey = "experiment";
  const memory = cache.get(cacheKey);
  if (!memory) {
    cache.put(cacheKey, new Date());
  }
  return NextResponse.json({ coldStart: !Boolean(memory) });
}
