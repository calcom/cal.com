import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import { totpAuthenticatorCheck } from "@calcom/lib/totp";
import prisma from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

async function postHandler(req: NextRequest) {
  const body = await parseRequestData(req);
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  if (!session.user?.id) {
    console.error("Session is missing a user id.");
    return NextResponse.json({ error: ErrorCode.InternalServerError }, { status: 500 });
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `api:totp-enable:${session.user.id}`,
  });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    console.error(`Session references user that no longer exists.`);
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: ErrorCode.TwoFactorAlreadyEnabled }, { status: 400 });
  }

  if (!user.twoFactorSecret) {
    return NextResponse.json({ error: ErrorCode.TwoFactorSetupRequired }, { status: 400 });
  }

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    console.error("Missing encryption key; cannot proceed with two factor setup.");
    return NextResponse.json({ error: ErrorCode.InternalServerError }, { status: 500 });
  }

  const secret = symmetricDecrypt(user.twoFactorSecret, process.env.CALENDSO_ENCRYPTION_KEY);
  if (secret.length !== 32) {
    console.error(
      `Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`
    );
    return NextResponse.json({ error: ErrorCode.InternalServerError }, { status: 500 });
  }

  const isValidToken = totpAuthenticatorCheck(body.code, secret);
  if (!isValidToken) {
    return NextResponse.json({ error: ErrorCode.IncorrectTwoFactorCode }, { status: 400 });
  }

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      twoFactorEnabled: true,
    },
  });

  return NextResponse.json({ message: "Two-factor enabled" });
}

export const POST = defaultResponderForAppDir(postHandler);
