import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function getHandler() {
  const headersList = await headers();
  const country = headersList.get("x-vercel-ip-country") || "Unknown";

  const response = NextResponse.json({ country });
  response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");

  return response;
}

export const GET = defaultResponderForAppDir(getHandler);
