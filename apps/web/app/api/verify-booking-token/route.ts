import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

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
  bookingUid: z.string(),
  userId: z.string(),
});

async function getHandler(request: NextRequest) {
  const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());

  try {
    const { action, token, bookingUid, userId } = querySchema.parse(queryParams);

    if (action === DirectAction.REJECT) {
      // Rejections should use POST method
      return NextResponse.redirect(
        new URL(
          `/booking/${bookingUid}?error=${encodeURIComponent("Rejection requires POST method")}`,
          request.url
        )
      );
    }

    return await handleBookingAction(action, token, bookingUid, userId, request, undefined);
  } catch {
    const bookingUid = queryParams.bookingUid || "";
    return NextResponse.redirect(
      new URL(`/booking/${bookingUid}?error=${encodeURIComponent("Error confirming booking")}`, request.url)
    );
  }
}

async function postHandler(request: NextRequest) {
  const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());

  try {
    const { action, token, bookingUid, userId } = querySchema.parse(queryParams);
    const body = await parseRequestData(request).catch(() => ({}));
    const { reason } = z.object({ reason: z.string().optional() }).parse(body || {});

    return await handleBookingAction(action, token, bookingUid, userId, request, reason);
  } catch {
    const bookingUid = queryParams.bookingUid || "";
    return NextResponse.redirect(
      new URL(`/booking/${bookingUid}?error=${encodeURIComponent("Error confirming booking")}`, request.url),
      { status: 303 }
    );
  }
}

async function handleBookingAction(
  action: DirectAction,
  token: string,
  bookingUid: string,
  userId: string,
  request: NextRequest,
  reason?: string
) {
  const booking = await prisma.booking.findUnique({
    where: { oneTimePassword: token },
  });

  if (!booking) {
    return NextResponse.redirect(
      new URL(`/booking/${bookingUid}?error=${encodeURIComponent("Error confirming booking")}`, request.url),
      { status: 303 }
    );
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: Number(userId) },
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
        traceContext: distributedTracing.createTrace("confirm_booking_verify_token"),
      },
      input: {
        bookingId: booking.id,
        recurringEventId: booking.recurringEventId || undefined,
        confirmed: action === DirectAction.ACCEPT,
        /** Ignored reason input unless we're rejecting */
        reason: action === DirectAction.REJECT ? reason : undefined,
        emailsEnabled: true,
        actionSource: "MAGIC_LINK",
        actor: makeUserActor(user.uuid),
      },
    });
  } catch (e) {
    let message = "Error confirming booking";
    if (e instanceof TRPCError) message = (e as TRPCError).message;
    return NextResponse.redirect(
      new URL(`/booking/${booking.uid}?error=${encodeURIComponent(message)}`, request.url),
      { status: 303 }
    );
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { oneTimePassword: null },
  });

  return NextResponse.redirect(new URL(`/booking/${booking.uid}`, request.url), { status: 303 });
}

export const GET = defaultResponderForAppDir(getHandler);
export const POST = defaultResponderForAppDir(postHandler);
