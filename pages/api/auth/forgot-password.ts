import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import dayjs from "dayjs";
import { User, ResetPasswordRequest } from "@prisma/client";
import sendEmail from "../../../lib/emails/sendMail";
import { buildForgotPasswordMessage } from "../../../lib/forgot-password/messaging/forgot-password";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
dayjs.extend(timezone);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "" });
  }

  try {
    const rawEmail = req.body?.email;

    const maybeUser: User = await prisma.user.findUnique({
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
      const expiry = dayjs().add(6, "hours").toDate();
      const createdResetPasswordRequest = await prisma.resetPasswordRequest.create({
        data: {
          email: rawEmail,
          expires: expiry,
        },
      });
      passwordRequest = createdResetPasswordRequest;
    }

    const passwordResetLink = `${process.env.BASE_URL}/auth/forgot-password/${passwordRequest.id}`;
    const { subject, message } = buildForgotPasswordMessage({
      user: {
        name: maybeUser.name,
      },
      link: passwordResetLink,
    });

    await sendEmail({
      to: rawEmail,
      subject: subject,
      text: message,
    });

    return res.status(201).json({ message: "Reset Requested", data: passwordRequest });
  } catch (reason) {
    console.error(reason);
    return res.status(500).json({ message: "Unable to create password reset request" });
  }
}
