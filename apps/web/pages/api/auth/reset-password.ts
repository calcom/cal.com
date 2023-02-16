import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { hashPassword } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(400).json({ message: "" });
  }

  try {
    const rawPassword = req.body?.password;
    const rawRequestId = req.body?.requestId;

    if (!rawPassword || !rawRequestId) {
      return res.status(400).json({ message: "Couldn't find an account for this email" });
    }

    const maybeRequest = await prisma.resetPasswordRequest.findUnique({
      where: {
        id: rawRequestId,
      },
    });

    if (!maybeRequest) {
      return res.status(400).json({ message: "Couldn't find an account for this email" });
    }

    const maybeUser = await prisma.user.findUnique({
      where: {
        email: maybeRequest.email,
      },
    });

    if (!maybeUser) {
      return res.status(400).json({ message: "Couldn't find an account for this email" });
    }

    const hashedPassword = await hashPassword(rawPassword);

    await prisma.user.update({
      where: {
        id: maybeUser.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    return res.status(201).json({ message: "Password reset." });
  } catch (reason) {
    console.error(reason);
    return res.status(500).json({ message: "Unable to create password reset request" });
  }
}
