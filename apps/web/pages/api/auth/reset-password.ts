import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { validPassword } from "@calcom/features/auth/lib/validPassword";
import prisma from "@calcom/prisma";

const passwordResetRequestSchema = z.object({
  password: z.string().refine(validPassword, () => ({
    message: "Password does not meet the requirements",
  })),
  requestId: z.string(), // format doesn't matter.
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Bad Method when not POST
  if (req.method !== "POST") return res.status(405).end();

  const { password: rawPassword, requestId: rawRequestId } = passwordResetRequestSchema.parse(req.body);
  // rate-limited there is a low, very low chance that a password request stays valid long enough
  // to brute force 3.8126967e+40 options.
  const maybeRequest = await prisma.resetPasswordRequest.findFirstOrThrow({
    where: {
      id: rawRequestId,
      expires: {
        gt: new Date(),
      },
    },
    select: {
      email: true,
    },
  });

  const hashedPassword = await hashPassword(rawPassword);
  // this can fail if a password request has been made for an email that has since changed or-
  // never existed within Cal. In this case we do not want to disclose the email's existence.
  // instead, we just return 404
  try {
    await prisma.user.update({
      where: {
        email: maybeRequest.email,
      },
      data: {
        password: hashedPassword,
      },
    });
  } catch (e) {
    return res.status(404).end();
  }

  await expireResetPasswordRequest(rawRequestId);

  return res.status(201).json({ message: "Password reset." });
}

async function expireResetPasswordRequest(rawRequestId: string) {
  await prisma.resetPasswordRequest.update({
    where: {
      id: rawRequestId,
    },
    data: {
      // We set the expiry to now to invalidate the request
      expires: new Date(),
    },
  });
}
