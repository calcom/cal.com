import isAuthorized from "@calcom/features/auth/lib/oAuthAuthorization";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

async function handler(req: NextRequest) {
  const requiredScopes = ["READ_PROFILE"];
  const token = req.headers.get("authorization")?.split(" ")[1] || "";
  const account = await isAuthorized(token, requiredScopes);

  if (!account) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ username: account.name }, { status: 201 });
}
export const GET = defaultResponderForAppDir(handler);
export const POST = defaultResponderForAppDir(handler);
