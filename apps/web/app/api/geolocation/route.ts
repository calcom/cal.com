import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { detectCountryFromHeaders } from "@calcom/lib/countryDetection";

async function getHandler() {
  const headersList = await headers();
  
  const mockReq = {
    headers: Object.fromEntries(headersList.entries())
  } as any;

  const detectionResult = detectCountryFromHeaders(mockReq);

  const response = NextResponse.json({ 
    country: detectionResult.countryCode || "Unknown",
    region: detectionResult.region,
    city: detectionResult.city,
    timezone: detectionResult.timezone,
    detectionMethod: detectionResult.detectionMethod,
    fallbackCountry: detectionResult.fallbackCountryCode || null
  });
  
  response.headers.set("Cache-Control", "private, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");

  return response;
}

export const GET = defaultResponderForAppDir(getHandler);
