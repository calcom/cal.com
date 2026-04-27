import { passwordResetRequest } from "@calcom/features/auth/lib/passwordResetRequest";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { emailSchema } from "@calcom/lib/emailSchema";
import getIP from "@calcom/lib/getIP";
import logger from "@calcom/lib/logger";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import prisma from "@calcom/prisma";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const log = logger.getSubLogger({ prefix: ["forgot-password"] });

async function handler(req: NextRequest) {
  const body = await parseRequestData(req);
  const email = emailSchema.transform((val) => val.toLowerCase()).safeParse(body?.email);

  if (!email.success) {
    return NextResponse.json({ message: "email is required" }, { status: 400 });
  }

  const ip = getIP(req) ?? email.data;

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `forgotPassword:${piiHasher.hash(ip)}`,
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.data },
      select: { name: true, email: true, locale: true },
    });
    // Don't leak info about whether the user exists
    if (user) passwordResetRequest(user).catch((err) => log.error("Failed to send password reset email", { err }));
    return NextResponse.json({ message: "password_reset_email_sent" }, { status: 201 });
  } catch (reason) {
    log.error("Unable to create password reset request", { reason });
    return NextResponse.json({ message: "Unable to create password reset request" }, { status: 500 });
  }
}

export const POST = defaultResponderForAppDir(handler);
