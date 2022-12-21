import { UserPermissionRole } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { CALENDSO_ENCRYPTION_KEY } from "@calcom/lib/constants";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { createContext } from "@calcom/trpc/server/createContext";
import { viewerRouter } from "@calcom/trpc/server/routers/viewer";

enum DirectAction {
  "accept" = "accept",
  "reject" = "reject",
}

const querytSchema = z.object({
  action: z.nativeEnum(DirectAction),
  token: z.string(),
  reason: z.string().optional(),
});

const decryptedSchema = z.object({
  email: z.string(),
  bookingUid: z.string(),
  userId: z.number().int(),
});

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  const { action, token, reason } = querytSchema.parse(req.query);
  const { bookingUid, email, userId } = decryptedSchema.parse(
    JSON.parse(symmetricDecrypt(token, CALENDSO_ENCRYPTION_KEY))
  );

  // Booking good to be accepted or rejected, proceeding to mark it
  /** We shape the session as required by tRPC router */
  async function sessionGetter() {
    return {
      user: {
        id: userId,
        username: "" /* Not used in this context */,
        role: UserPermissionRole.USER,
      },
      hasValidLicense: true,
      expires: "" /* Not used in this context */,
    };
  }

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { uid: bookingUid },
  });

  /** @see https://trpc.io/docs/server-side-calls */
  const ctx = await createContext({ req, res }, sessionGetter);
  const caller = viewerRouter.createCaller(ctx);
  await caller.bookings.confirm({
    bookingId: booking.id,
    recurringEventId: booking.recurringEventId || undefined,
    confirmed: action === DirectAction.accept,
    reason,
  });

  return res.redirect(`/booking/${bookingUid}`);
}

export default defaultResponder(handler);
