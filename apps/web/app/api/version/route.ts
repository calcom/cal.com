import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { NextResponse } from "next/server";
import * as pjson from "package.json";

async function getHandler() {
  return NextResponse.json({ version: pjson.version });
}

export const GET = defaultResponderForAppDir(getHandler);
