import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import prisma from "@calcom/prisma";

const querySchema = z.object({
  meetingId: z.string(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const meetingId = url.pathname.split("/").pop();

  if (!meetingId) {
    return new NextResponse("Meeting ID is required", { status: 400 });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: {
        uid: meetingId,
      },
      select: {
        uid: true,
        location: true,
        videoCallData: true,
        additionalInformation: true,
      },
    });

    if (!booking) {
      return new NextResponse("Meeting not found", { status: 404 });
    }

    const videoCallUrl = getVideoCallUrlFromCalEvent({
      uid: booking.uid,
      videoCallData: booking.videoCallData,
      additionalInformation: booking.additionalInformation,
      location: booking.location,
    });

    if (!videoCallUrl) {
      return new NextResponse("No video call URL found", { status: 404 });
    }

    return NextResponse.redirect(videoCallUrl);
  } catch (error) {
    console.error("Error redirecting to video call:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
