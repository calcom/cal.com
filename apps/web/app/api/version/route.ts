import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { NextResponse } from "next/server";
import packageJson from "package.json";

async function getHandler() {
  return NextResponse.json({ version: packageJson.version });
}

export const GET = defaultResponderForAppDir(getHandler);
