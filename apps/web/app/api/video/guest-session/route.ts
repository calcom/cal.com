import { validateCsrfToken } from "app/api/csrf/utils";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  generateGuestMeetingTokenFromOwnerMeetingToken,
  updateMeetingTokenIfExpired,
} from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getCalVideoReference } from "@calcom/features/get-cal-video-reference";
import { VideoCallGuestRepository } from "@calcom/features/video-call-guest/repositories/VideoCallGuestRepository";
import prisma from "@calcom/prisma";

const videoCallGuestWithCsrfSchema = z.object({
  bookingUid: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  csrfToken: z.string().length(64, "Invalid CSRF token"),
});

async function handler(req: NextRequest) {
  let appDirRequestBody;
  try {
    appDirRequestBody = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  const guestData = videoCallGuestWithCsrfSchema.parse(appDirRequestBody);

  const csrfError = await validateCsrfToken(guestData.csrfToken);
  if (csrfError) {
    return csrfError;
  }

  const bookingRepo = new BookingRepository(prisma);
  const booking = await bookingRepo.findBookingIncludeCalVideoSettingsAndReferences({
    bookingUid: guestData.bookingUid,
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const videoCallGuestRepo = new VideoCallGuestRepository(prisma);
  const guestSession = await videoCallGuestRepo.upsertVideoCallGuest({
    bookingUid: guestData.bookingUid,
    email: guestData.email,
    name: guestData.name,
  });

  const videoReference = getCalVideoReference(booking.references);

  if (!videoReference) {
    return NextResponse.json({ error: "Video reference not found" }, { status: 404 });
  }

  const endTime = new Date(booking.endTime);
  const fourteenDaysAfter = new Date(endTime.getTime() + 14 * 24 * 60 * 60 * 1000);
  const epochTimeFourteenDaysAfter = Math.floor(fourteenDaysAfter.getTime() / 1000);

  const videoReferencePassword = await updateMeetingTokenIfExpired({
    bookingReferenceId: videoReference.id,
    roomName: videoReference.uid,
    meetingToken: videoReference.meetingPassword,
    exp: epochTimeFourteenDaysAfter,
  });

  const guestMeetingPassword = await generateGuestMeetingTokenFromOwnerMeetingToken({
    meetingToken: videoReferencePassword,
    userId: guestSession.id,
  });

  return NextResponse.json({
    guestSessionId: guestSession.id,
    meetingPassword: guestMeetingPassword,
    meetingUrl: videoReference.meetingUrl,
  });
}

export const POST = defaultResponderForAppDir(handler);
