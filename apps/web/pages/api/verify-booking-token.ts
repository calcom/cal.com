import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { createContext } from "@calcom/trpc/server/createContext";
import { bookingsRouter } from "@calcom/trpc/server/routers/viewer/bookings/_router";
import type { UserProfile } from "@calcom/types/UserProfile";

enum DirectAction {
  ACCEPT = "accept",
  REJECT = "reject",
}

const querySchema = z.object({
  action: z.nativeEnum(DirectAction),
  token: z.string(),
  userId: z.string(),
  bookingUid: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  const { action, token, userId, bookingUid } = querySchema.parse(req.query);

  const booking = await prisma.booking.findUnique({
    where: { oneTimePassword: token },
  });

  if (!booking) {
    res.redirect(`/booking/${bookingUid}/404`);
    return;
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: Number(userId) },
  });

  /** We shape the session as required by tRPC router */
  async function sessionGetter() {
    return {
      user: {
        id: Number(userId),
        username: "" /* Not used in this context */,
        role: UserPermissionRole.USER,
        /* Not used in this context */
        profile: {
          id: null,
          organizationId: null,
          organization: null,
          username: "",
          upId: "",
        } satisfies UserProfile,
      },
      upId: "",
      hasValidLicense: true,
      expires: "" /* Not used in this context */,
    };
  }

  try {
    /** @see https://trpc.io/docs/server-side-calls */
    const ctx = await createContext({ req, res }, sessionGetter);
    const caller = bookingsRouter.createCaller({
      ...ctx,
      req,
      res,
      user: { ...user, locale: user?.locale ?? "en" },
    });
    await caller.confirm({
      bookingId: booking.id,
      recurringEventId: booking.recurringEventId || undefined,
      confirmed: action === DirectAction.ACCEPT,
    });
  } catch (e) {
    res.redirect(`/booking/${bookingUid}/404`);
    return;
  }

  res.redirect(`/booking/${bookingUid}`);
}

export default defaultResponder(handler);
