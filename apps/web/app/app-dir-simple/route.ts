import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
let cold = true;
export async function GET() {
  const coldStart = cold;
  cold = false;

  return NextResponse.json({ coldStart, date: new Date().toISOString() });
}
