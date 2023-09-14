import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { passwordResetRequest } from "@calcom/features/auth/lib/passwordResetRequest";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const email = z
    .string()
    .email()
    .transform((val) => val.toLowerCase())
    .safeParse(req.body?.email);

  if (!email.success) {
    return res.status(400).json({ message: "email is required" });
  }

  // fallback to email if ip is not present
  let ip = (req.headers["x-real-ip"] as string) ?? email.data;

  const forwardedFor = req.headers["x-forwarded-for"] as string;
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
    if (!user) return res.status(201).json({ message: "password_reset_email_sent" });
    await passwordResetRequest(user);
    return res.status(201).json({ message: "password_reset_email_sent" });
  } catch (reason) {
    console.error(reason);
    return res.status(500).json({ message: "Unable to create password reset request" });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
