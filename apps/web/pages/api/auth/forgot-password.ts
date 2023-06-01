import type { ResetPasswordRequest } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { sendPasswordResetEmail } from "@calcom/emails";
import { PASSWORD_RESET_EXPIRY_HOURS } from "@calcom/emails/templates/forgot-password-email";
import rateLimit from "@calcom/lib/rateLimit";
import { defaultHandler } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";

const limiter = rateLimit({
  intervalInMs: 60 * 1000, // 1 minute
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = await getTranslation(req.body.language ?? "en", "common");

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

  try {
    limiter.check(10, ip);
  } catch (e) {
    return res.status(429).json({ message: "Too Many Requests." });
  }

  try {
    const maybeUser = await prisma.user.findUnique({
      where: {
        email: email.data,
      },
      select: {
        name: true,
        identityProvider: true,
        email: true,
      },
    });

    if (!maybeUser) {
      // Don't leak information about whether an email is registered or not
      return res
        .status(200)
        .json({ message: "If this email exists in our system, you should receive a Reset email." });
    }

    const maybePreviousRequest = await prisma.resetPasswordRequest.findMany({
      where: {
        email: maybeUser.email,
        expires: {
          gt: new Date(),
        },
      },
    });

    let passwordRequest: ResetPasswordRequest;

    if (maybePreviousRequest && maybePreviousRequest?.length >= 1) {
      passwordRequest = maybePreviousRequest[0];
    } else {
      const expiry = dayjs().add(PASSWORD_RESET_EXPIRY_HOURS, "hours").toDate();
      const createdResetPasswordRequest = await prisma.resetPasswordRequest.create({
        data: {
          email: maybeUser.email,
          expires: expiry,
        },
      });
      passwordRequest = createdResetPasswordRequest;
    }

    const resetLink = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/auth/forgot-password/${passwordRequest.id}`;
    await sendPasswordResetEmail({
      language: t,
      user: maybeUser,
      resetLink,
    });

    /** So we can test the password reset flow on CI */
    if (process.env.NEXT_PUBLIC_IS_E2E) {
      return res.status(201).json({
        message: "If this email exists in our system, you should receive a Reset email.",
        resetLink,
      });
    } else {
      return res
        .status(201)
        .json({ message: "If this email exists in our system, you should receive a Reset email." });
    }
  } catch (reason) {
    // console.error(reason);
    return res.status(500).json({ message: "Unable to create password reset request" });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
