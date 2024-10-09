import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { TRPCError } from "@calcom/trpc/server";
import { createContext } from "@calcom/trpc/server/createContext";
import { bookingsRouter } from "@calcom/trpc/server/routers/viewer/bookings/_router";
import { createCallerFactory } from "@calcom/trpc/server/trpc";
import type { UserProfile } from "@calcom/types/UserProfile";

enum DirectAction {
  ACCEPT = "accept",
  REJECT = "reject",
}

const querySchema = z.object({
  action: z.nativeEnum(DirectAction),
  token: z.string(),
  bookingUid: z.string(),
  userId: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  const { action, token, bookingUid, userId } = querySchema.parse(req.query);
  // Rejections runs on a POST request, confirming on a GET request.
  const { reason } = z.object({ reason: z.string().optional() }).parse(req.body || {});

  const booking = await prisma.booking.findUnique({
    where: { oneTimePassword: token },
  });

  if (!booking) {
    res.redirect(`/booking/${bookingUid}?error=${encodeURIComponent("Error confirming booking")}`);
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
    const createCaller = createCallerFactory(bookingsRouter);
    const ctx = await createContext({ req, res }, sessionGetter);
    const caller = createCaller({
      ...ctx,
      req,
      res,
      user: { ...user, locale: user?.locale ?? "en" },
    });
    await caller.confirm({
      bookingId: booking.id,
      recurringEventId: booking.recurringEventId || undefined,
      confirmed: action === DirectAction.ACCEPT,
      /** Ignored reason input unless we're rejecting */
      reason: action === DirectAction.REJECT ? reason : undefined,
    });
  } catch (e) {
    let message = "Error confirming booking";
    if (e instanceof TRPCError) message = (e as TRPCError).message;
    res.redirect(`/booking/${booking.uid}?error=${encodeURIComponent(message)}`);
    return;
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { oneTimePassword: null },
  });

  res.redirect(`/booking/${booking.uid}`);
}

export default defaultResponder(handler);
