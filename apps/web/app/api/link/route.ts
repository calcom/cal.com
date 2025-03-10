import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { symmetricDecrypt } from "@calcom/lib/crypto";
import prisma from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { createContext } from "@calcom/trpc/server/createContext";
import { bookingsRouter } from "@calcom/trpc/server/routers/viewer/bookings/_router";
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
  reason: z.string().optional(),
});

const decryptedSchema = z.object({
  bookingUid: z.string(),
  userId: z.number().int(),
});

// Move the sessionGetter function outside the GET function
const createSessionGetter = (userId: number) => async () => {
  return {
    user: {
      id: userId,
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
};

async function handler(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = request.nextUrl.searchParams;

  const { action, token, reason } = querySchema.parse(Object.fromEntries(searchParams.entries()));

  const decryptedData = JSON.parse(
    symmetricDecrypt(decodeURIComponent(token), process.env.CALENDSO_ENCRYPTION_KEY || "")
  );

  const { bookingUid, userId } = decryptedSchema.parse(decryptedData);

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { uid: bookingUid },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  // Use the factory function instead of declaring inside the block
  const sessionGetter = createSessionGetter(userId);

  try {
    /** @see https://trpc.io/docs/server-side-calls */
    // Create a legacy request object for compatibility
    const legacyReq = buildLegacyRequest(headers(), cookies());
    const res = {} as any; // Response is still mocked as it's not used in this context

    const ctx = await createContext({ req: legacyReq, res }, sessionGetter);
    const caller = bookingsRouter.createCaller({
      ...ctx,
      req: legacyReq,
      res,
      user: { ...user, locale: user?.locale ?? "en" },
    });

    await caller.confirm({
      bookingId: booking.id,
      recurringEventId: booking.recurringEventId || undefined,
      confirmed: action === DirectAction.ACCEPT,
      reason,
    });
  } catch (e) {
    let message = "Error confirming booking";
    if (e instanceof TRPCError) message = (e as TRPCError).message;
    return NextResponse.redirect(`${url.origin}/booking/${bookingUid}?error=${encodeURIComponent(message)}`);
  }

  return NextResponse.redirect(`${url.origin}/booking/${bookingUid}`);
}

export const GET = defaultResponderForAppDir(handler);
