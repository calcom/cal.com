import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { symmetricDecrypt } from "@calcom/lib/crypto";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { TRPCError } from "@calcom/trpc/server";
import { createContext } from "@calcom/trpc/server/createContext";
import { viewerRouter } from "@calcom/trpc/server/routers/viewer/_router";

enum DirectAction {
  ACCEPT = "accept",
  REJECT = "reject",
}

const querySchema = z.object({
  action: z.nativeEnum(DirectAction),
  token: z.string(),
  reason: z.string().optional(),
});

const decryptedSchema = z.object({
  bookingUid: z.string(),
  userId: z.number().int(),
});

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  const { action, token, reason } = querySchema.parse(req.query);
  const { bookingUid, userId } = decryptedSchema.parse(
    JSON.parse(symmetricDecrypt(decodeURIComponent(token), process.env.CALENDSO_ENCRYPTION_KEY || ""))
  );

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { uid: bookingUid },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  try {
    /** @see https://trpc.io/docs/server-side-calls */
    const ctx = await createContext({ req, res });
    const caller = viewerRouter.createCaller({
      ...ctx,
      req,
      res,
      user: { ...user, locale: user?.locale ?? "en" },
    });
    await caller.bookings.confirm({
      bookingId: booking.id,
      recurringEventId: booking.recurringEventId || undefined,
      confirmed: action === DirectAction.ACCEPT,
      reason,
    });
  } catch (e) {
    let message = "Error confirming booking";
    if (e instanceof TRPCError) message = e.message;
    res.redirect(`/booking/${bookingUid}?error=${encodeURIComponent(message)}`);
    return;
  }

  res.redirect(`/booking/${bookingUid}`);
}

export default defaultResponder(handler);
