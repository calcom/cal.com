import crypto from "node:crypto";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

async function getHandler() {
  const headersList = await headers();
  const cookiesList = await cookies();
  const legacyReq = buildLegacyRequest(headersList, cookiesList);

  const session = await getServerSession({ req: legacyReq });
  const secret = process.env.INTERCOM_SECRET;

  if (!session) {
    return NextResponse.json({ message: "user not authenticated" }, { status: 401 });
  }

  if (!secret) {
    return NextResponse.json({ message: "Intercom Identity Verification secret not set" }, { status: 400 });
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(String(session.user.id));
  const hash = hmac.digest("hex");

  return NextResponse.json({ hash });
}

export const GET = defaultResponderForAppDir(getHandler);
