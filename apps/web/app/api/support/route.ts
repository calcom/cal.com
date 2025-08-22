import { NextResponse } from "next/server";

export async function POST(_req: Request) {
  return NextResponse.json({ error: "Plain Chat is no longer supported" }, { status: 404 });
}
