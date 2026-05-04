import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function getHandler() {
  const headersList = await headers();
  const country = headersList.get("cf-ipcountry") || headersList.get("x-vercel-ip-country") || "Unknown";

  const response = NextResponse.json({ country });
  // The response varies by request headers (cf-ipcountry / x-vercel-ip-country).
  // A shared CDN cache without a Vary key would serve one user's country to
  // every other user. The only consumer (apps/web/components/GTM.tsx) already
  // does its own 24h localStorage + react-query cache, so per-user browser
  // caching is enough.
  response.headers.set("Cache-Control", "private, max-age=3600");

  return response;
}

export const GET = defaultResponderForAppDir(getHandler);
