import { NextResponse } from "next/server";
import getIP from "@calcom/lib/getIP";

export async function GET(req: Request) {
  const requestorIp = getIP(req);
  return NextResponse.json({ ip: requestorIp });
}
