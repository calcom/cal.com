import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { symmetricDecrypt } from "@calcom/lib/crypto";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import prisma from "@calcom/prisma";
import { confirmHandler } from "@calcom/trpc/server/routers/viewer/bookings/confirm.handler";
import { TRPCError } from "@trpc/server";
import { makeUserActor } from "@calcom/features/booking-audit/lib/makeActor";

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
  platformClientId: z.string().optional(),
  platformRescheduleUrl: z.string().optional(),
  platformCancelUrl: z.string().optional(),
  platformBookingUrl: z.string().optional(),
});

async function handler(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const { action, token, reason } = querySchema.parse(Object.fromEntries(searchParams.entries()));

  const decryptedData = JSON.parse(
    symmetricDecrypt(decodeURIComponent(token), process.env.CALENDSO_ENCRYPTION_KEY || "")
  );

  const {
    bookingUid,
    userId,
    platformClientId,
    platformRescheduleUrl,
    platformCancelUrl,
    platformBookingUrl,
  } = decryptedSchema.parse(decryptedData);

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { uid: bookingUid },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      uuid: true,
      email: true,
      username: true,
      role: true,
      destinationCalendar: true,
    },
  });

  try {
    await confirmHandler({
      ctx: {
        user: {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          username: user.username ?? "",
          role: user.role,
          destinationCalendar: user.destinationCalendar ?? null,
        },
        traceContext: distributedTracing.createTrace("confirm_booking_magic_link"),
      },
      input: {
        bookingId: booking.id,
        recurringEventId: booking.recurringEventId || undefined,
        confirmed: action === DirectAction.ACCEPT,
        reason,
        emailsEnabled: true,
        platformClientParams: platformClientId
          ? {
              platformClientId,
              platformRescheduleUrl,
              platformCancelUrl,
              platformBookingUrl,
            }
          : undefined,
        actionSource: "MAGIC_LINK",
        actor: makeUserActor(user.uuid),
      },
    });
  } catch (e) {
    let message = "Error confirming booking";
    if (e instanceof TRPCError) message = (e as TRPCError).message;
    return NextResponse.redirect(
      new URL(`/booking/${bookingUid}?error=${encodeURIComponent(message)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL(`/booking/${bookingUid}`, request.url));
}

export const GET = defaultResponderForAppDir(handler);
