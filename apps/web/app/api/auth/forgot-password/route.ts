import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { passwordResetRequest } from "@calcom/features/auth/lib/passwordResetRequest";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { emailSchema } from "@calcom/lib/emailSchema";
import { apiRouteMiddleware } from "@calcom/lib/server/apiRouteMiddleware";
import prisma from "@calcom/prisma";

async function handler(request: NextRequest) {
  const email = emailSchema.transform((val) => val.toLowerCase()).safeParse((await request.json())?.email);

  if (!email.success) {
    return NextResponse.json({ message: "email is required" }, { status: 400 });
  }

  // fallback to email if ip is not present
  let ip = (request.headers.get("x-real-ip") as string) ?? email.data;

  const forwardedFor = request.headers.get("x-forwarded-for") as string;
  if (!ip && forwardedFor) {
    ip = forwardedFor?.split(",").at(0) ?? email.data;
  }

  // 10 requests per minute

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: ip,
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.data },
      select: { name: true, email: true, locale: true },
    });
    // Don't leak info about whether the user exists
    if (!user) return NextResponse.json({ message: "password_reset_email_sent" }, { status: 201 });
    await passwordResetRequest(user);
    return NextResponse.json({ message: "password_reset_email_sent" }, { status: 201 });
  } catch (reason) {
    console.error(reason);
    return NextResponse.json({ message: "Unable to create password reset request" }, { status: 500 });
  }
}

const postHandler = apiRouteMiddleware((req: NextRequest) => handler(req));

export { postHandler as POST };
