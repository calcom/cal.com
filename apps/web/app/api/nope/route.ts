import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { NextResponse } from "next/server";

async function getHandler() {
  return NextResponse.json({ message: "Please don't" }, { status: 400 });
}

async function postHandler() {
  return NextResponse.json({ message: "Please don't" }, { status: 400 });
}

export const GET = defaultResponderForAppDir(getHandler);
export const POST = defaultResponderForAppDir(postHandler);
