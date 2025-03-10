import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Please don't" }, { status: 400 });
}

export async function POST() {
  return NextResponse.json({ message: "Please don't" }, { status: 400 });
}
