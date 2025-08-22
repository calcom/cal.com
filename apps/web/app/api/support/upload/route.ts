import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Plain Chat has been removed - this endpoint is no longer available
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json({ error: "Plain Chat is no longer available" }, { status: 404 });
}

export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: "Plain Chat is no longer available" }, { status: 404 });
}
