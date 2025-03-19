import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import { headers, cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { createContext } from "@calcom/trpc/server/createContext";
import { bookingsRouter } from "@calcom/trpc/server/routers/viewer/bookings/_router";
import { createCallerFactory } from "@calcom/trpc/server/trpc";
import type { UserProfile } from "@calcom/types/UserProfile";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { TRPCError } from "@trpc/server";

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
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());

  try {
    const { action, token, bookingUid, userId } = querySchema.parse(queryParams);

    if (action === DirectAction.REJECT) {
      // Rejections should use POST method
      return NextResponse.redirect(
        `${url.origin}/booking/${bookingUid}?error=${encodeURIComponent("Rejection requires POST method")}`
      );
    }

    return await handleBookingAction(action, token, bookingUid, userId, undefined, request);
  } catch (error) {
    const bookingUid = queryParams.bookingUid || "";
    return NextResponse.redirect(
      `${url.origin}/booking/${bookingUid}?error=${encodeURIComponent("Error confirming booking")}`
    );
  }
}

async function postHandler(request: NextRequest) {
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());

  try {
    const { action, token, bookingUid, userId } = querySchema.parse(queryParams);
    const body = await parseRequestData(request).catch(() => ({}));
    const { reason } = z.object({ reason: z.string().optional() }).parse(body || {});

    return await handleBookingAction(action, token, bookingUid, userId, reason, request);
  } catch (error) {
    const bookingUid = queryParams.bookingUid || "";
    return NextResponse.redirect(
      `${url.origin}/booking/${bookingUid}?error=${encodeURIComponent("Error confirming booking")}`
    );
  }
}

async function handleBookingAction(
  action: DirectAction,
  token: string,
  bookingUid: string,
  userId: string,
  reason?: string,
  request?: NextRequest
) {
  const booking = await prisma.booking.findUnique({
    where: { oneTimePassword: token },
  });

  if (!booking) {
    return NextResponse.redirect(
      `/booking/${bookingUid}?error=${encodeURIComponent("Error confirming booking")}`
    );
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

    // Use buildLegacyRequest to create a request object compatible with Pages Router
    const legacyReq = request ? buildLegacyRequest(headers(), cookies()) : ({} as any);
    const res = {} as any;

    const ctx = await createContext({ req: legacyReq, res }, sessionGetter);
    const caller = createCaller({
      ...ctx,
      req: legacyReq,
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
    return NextResponse.redirect(`/booking/${booking.uid}?error=${encodeURIComponent(message)}`);
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { oneTimePassword: null },
  });

  return NextResponse.redirect(`/booking/${booking.uid}`);
}

export const GET = defaultResponderForAppDir(getHandler);
export const POST = defaultResponderForAppDir(postHandler);
