import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { validPassword } from "@calcom/features/auth/lib/validPassword";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";

const passwordResetRequestSchema = z.object({
  password: z.string().refine(validPassword, () => ({
    message: "Password does not meet the requirements",
  })),
  requestId: z.string(), // format doesn't matter.
});

async function handler(req: NextRequest) {
  const body = await parseRequestData(req);

  const { password: rawPassword, requestId: rawRequestId } = passwordResetRequestSchema.parse(body);
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
        password: {
          upsert: {
            create: { hash: hashedPassword },
            update: { hash: hashedPassword },
          },
        },
        emailVerified: new Date(),
        identityProvider: IdentityProvider.CAL,
        identityProviderId: null,
      },
    });
  } catch (e) {
    return NextResponse.json({}, { status: 404 });
  }

  await expireResetPasswordRequest(rawRequestId);

  return NextResponse.json({ message: "Password reset." }, { status: 201 });
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

export const POST = defaultResponderForAppDir(handler);
