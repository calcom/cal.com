import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  generateGuestMeetingTokenFromOwnerMeetingToken,
  updateMeetingTokenIfExpired,
} from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { getCalVideoReference } from "@calcom/features/get-cal-video-reference";
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
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("calcom.csrf_token")?.value;

  if (!cookieToken || cookieToken !== guestData.csrfToken) {
    return NextResponse.json({ success: false, message: "Invalid CSRF token" }, { status: 403 });
  }
  cookieStore.delete("calcom.csrf_token");

  const booking = await prisma.booking.findUnique({
    where: { uid: guestData.bookingUid },
    include: {
      references: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const guestSession = await prisma.videoCallGuest.upsert({
    where: {
      bookingUid_email: {
        bookingUid: guestData.bookingUid,
        email: guestData.email,
      },
    },
    update: { name: guestData.name },
    create: {
      bookingUid: guestData.bookingUid,
      email: guestData.email,
      name: guestData.name,
    },
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
