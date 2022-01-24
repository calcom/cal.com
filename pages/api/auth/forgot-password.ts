import { ResetPasswordRequest } from "@prisma/client";
import dayjs from "dayjs";
import { NextApiRequest, NextApiResponse } from "next";

import { sendPasswordResetEmail } from "@lib/emails/email-manager";
import { PasswordReset, PASSWORD_RESET_EXPIRY_HOURS } from "@lib/emails/templates/forgot-password-email";
import prisma from "@lib/prisma";

import { getTranslation } from "@server/lib/i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = await getTranslation(req.body.language ?? "en", "common");

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const maybeUser = await prisma.user.findUnique({
      where: {
        email: req.body?.email?.toLowerCase(),
      },
      select: {
        name: true,
        identityProvider: true,
        email: true,
      },
    });

    if (!maybeUser) {
      return res.status(400).json({ message: "Couldn't find an account for this email" });
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

    const resetLink = `${process.env.BASE_URL}/auth/forgot-password/${passwordRequest.id}`;
    const passwordEmail: PasswordReset = {
      language: t,
      user: maybeUser,
      resetLink,
    };

    await sendPasswordResetEmail(passwordEmail);

    /** So we can test the password reset flow on CI */
    if (
      process.env.PLAYWRIGHT_SECRET &&
      req.headers["x-playwright-secret"] === process.env.PLAYWRIGHT_SECRET
    ) {
      return res.status(201).json({ message: "Reset Requested", resetLink });
    }

    return res.status(201).json({ message: "Reset Requested" });
  } catch (reason) {
    // console.error(reason);
    return res.status(500).json({ message: "Unable to create password reset request" });
  }
}
