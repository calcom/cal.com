import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { passwordResetRequest } from "@calcom/features/auth/lib/passwordResetRequest";
import { emailSchema } from "@calcom/lib/emailSchema";
import prisma from "@calcom/prisma";

async function handler(req: NextRequest) {
  const body = await parseRequestData(req);
  const email = emailSchema.transform((val) => val.toLowerCase()).safeParse(body?.email);

  if (!email.success) {
    return NextResponse.json({ message: "email is required" }, { status: 400 });
  }

  // IP-based rate limiting removed - now handled by Cloudflare Enterprise Advanced Rate Limiting

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.data },
      select: { name: true, email: true, locale: true },
    });
    // Don't leak info about whether the user exists
    if (user) passwordResetRequest(user).catch(console.error);
    return NextResponse.json({ message: "password_reset_email_sent" }, { status: 201 });
  } catch (reason) {
    console.error(reason);
    return NextResponse.json({ message: "Unable to create password reset request" }, { status: 500 });
  }
}

export const POST = defaultResponderForAppDir(handler);
