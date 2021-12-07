import { ResetPasswordRequest } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { NextApiRequest, NextApiResponse } from "next";

import { sendPasswordResetEmail } from "@lib/emails/email-manager";
import { PasswordReset, PASSWORD_RESET_EXPIRY_HOURS } from "@lib/emails/templates/forgot-password-email";
import prisma from "@lib/prisma";

import { getTranslation } from "@server/lib/i18n";

dayjs.extend(utc);
dayjs.extend(timezone);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = await getTranslation(req.body.language ?? "en", "common");

  if (req.method !== "POST") {
    return res.status(405).json({ message: "" });
  }

  try {
    const rawEmail = req.body?.email;

    const maybeUser = await prisma.user.findUnique({
      where: {
        email: rawEmail,
      },
      select: {
        name: true,
      },
    });

    if (!maybeUser) {
      return res.status(400).json({ message: "Couldn't find an account for this email" });
    }

    const now = dayjs().toDate();
    const maybePreviousRequest = await prisma.resetPasswordRequest.findMany({
      where: {
        email: rawEmail,
        expires: {
          gt: now,
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
          email: rawEmail,
          expires: expiry,
        },
      });
      passwordRequest = createdResetPasswordRequest;
    }

    const passwordEmail: PasswordReset = {
      language: t,
      user: {
        name: maybeUser.name,
        email: rawEmail,
      },
      resetLink: `${process.env.BASE_URL}/auth/forgot-password/${passwordRequest.id}`,
    };

    await sendPasswordResetEmail(passwordEmail);

    return res.status(201).json({ message: "Reset Requested" });
  } catch (reason) {
    console.error(reason);
    return res.status(500).json({ message: "Unable to create password reset request" });
  }
}
