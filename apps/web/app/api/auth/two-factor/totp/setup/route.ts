import crypto from "node:crypto";
import process from "node:process";
import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { verifyPassword } from "@calcom/features/auth/lib/verifyPassword";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import qrcode from "qrcode";

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
    identifier: `api:totp-setup:${session.user.id}`,
  });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { password: true } });

  if (!user) {
    console.error(`Session references user that no longer exists.`);
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  if (user.identityProvider !== IdentityProvider.CAL && !user.password?.hash) {
    return NextResponse.json({ error: ErrorCode.ThirdPartyIdentityProviderEnabled }, { status: 400 });
  }

  if (!user.password?.hash) {
    return NextResponse.json({ error: ErrorCode.UserMissingPassword }, { status: 400 });
  }

  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: ErrorCode.TwoFactorAlreadyEnabled }, { status: 400 });
  }

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    console.error("Missing encryption key; cannot proceed with two factor setup.");
    return NextResponse.json({ error: ErrorCode.InternalServerError }, { status: 500 });
  }

  const isCorrectPassword = await verifyPassword(body.password, user.password.hash);
  if (!isCorrectPassword) {
    return NextResponse.json({ error: ErrorCode.IncorrectPassword }, { status: 400 });
  }

  // This generates a secret 32 characters in length. Do not modify the number of
  // bytes without updating the sanity checks in the enable and login endpoints.
  const secret = authenticator.generateSecret(20);

  // Generate backup codes with 10 character length
  const backupCodes = Array.from(Array(10), () => crypto.randomBytes(5).toString("hex"));

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      backupCodes: symmetricEncrypt(JSON.stringify(backupCodes), process.env.CALENDSO_ENCRYPTION_KEY),
      twoFactorEnabled: false,
      twoFactorSecret: symmetricEncrypt(secret, process.env.CALENDSO_ENCRYPTION_KEY),
    },
  });

  const name = user.email || user.username || user.id.toString();
  const keyUri = authenticator.keyuri(name, "Cal", secret);
  const dataUri = await qrcode.toDataURL(keyUri);

  return NextResponse.json({ secret, keyUri, dataUri, backupCodes });
}

export const POST = defaultResponderForAppDir(postHandler);
