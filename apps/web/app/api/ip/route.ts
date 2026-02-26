import getIP, { IP_HEADERS, parseIpFromHeaders } from "@calcom/lib/getIP";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const requestorIp = getIP(req);

  // /api/ip?debug=1 includes all IP-related header values for diagnostics.
  const url = new URL(req.url);
  if (url.searchParams.get("debug") === "1") {
    const headerSnapshot: Record<string, string | null> = {};
    for (const name of IP_HEADERS) {
      const raw = req.headers.get(name);
      headerSnapshot[name] = raw ? parseIpFromHeaders(raw) : null;
    }
    return NextResponse.json({ ip: requestorIp, headers: headerSnapshot });
  }

  return NextResponse.json({ ip: requestorIp });
}
