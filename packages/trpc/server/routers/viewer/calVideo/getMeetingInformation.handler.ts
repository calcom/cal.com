import DailyVideoApiAdapter from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetMeetingInformationInputSchema } from "./getMeetingInformation.schema";

type GetMeetingInformationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetMeetingInformationInputSchema;
};

export const getMeetingInformationHandler = async ({ ctx, input }: GetMeetingInformationOptions) => {
  const { roomName } = input;

  try {
    const videoApiAdapter = DailyVideoApiAdapter();
    if (!videoApiAdapter || !videoApiAdapter.getMeetingInformation) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Meeting information feature not available",
      });
    }

    const bookingReference = await prisma.bookingReference.findFirst({
      where: {
        uid: roomName,
        type: "daily_video",
      },
      include: {
        booking: {
          include: {
            user: true,
            eventType: true,
            attendees: true,
          },
        },
      },
    });

    if (!bookingReference || !bookingReference.booking) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Meeting room not found",
      });
    }

    const booking = bookingReference.booking;
    const hasAccess =
      booking.userId === ctx.user.id ||
      booking.attendees.some((attendee) => attendee.email === ctx.user.email) ||
      (booking.eventType &&
        booking.eventType.teamId &&
        (await prisma.membership.findFirst({
          where: {
            userId: ctx.user.id,
            teamId: booking.eventType.teamId,
          },
        })));

    if (!hasAccess) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to this meeting",
      });
    }

    const meetingInfo = await videoApiAdapter.getMeetingInformation(roomName);

    const enhancedResponse = {
      ...meetingInfo,
      booking: {
        id: booking.id,
        uid: booking.uid,
        title: booking.title,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
      },
      eventType: booking.eventType
        ? {
            id: booking.eventType.id,
            title: booking.eventType.title,
            description: booking.eventType.description,
          }
        : null,
      organizer: {
        id: booking.user?.id,
        name: booking.user?.name,
        email: booking.user?.email,
      },
    };

    if (meetingInfo.data && meetingInfo.data.length > 0) {
      const session = meetingInfo.data[0];

      if (videoApiAdapter.triggerVideoStartedWebhook && session.ongoing && session.participants.length > 0) {
        const latestJoinTime = Math.max(...session.participants.map((p) => p.join_time));
        const timeSinceJoin = Date.now() / 1000 - latestJoinTime;

        if (timeSinceJoin < 60) {
          try {
            await videoApiAdapter.triggerVideoStartedWebhook(session.id, booking.id);
          } catch (webhookError) {
            console.error("Error triggering video started webhook:", webhookError);
          }
        }
      }

      if (videoApiAdapter.triggerVideoEndedWebhook && !session.ongoing && session.duration > 0) {
        try {
          await videoApiAdapter.triggerVideoEndedWebhook(session.id, booking.id, session.duration / 60);
        } catch (webhookError) {
          console.error("Error triggering video ended webhook:", webhookError);
        }
      }
    }

    return enhancedResponse;
  } catch (err) {
    if (err instanceof TRPCError) {
      throw err;
    }

    console.error("Error getting meeting information:", err);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: err instanceof Error ? err.message : "Failed to get meeting information",
    });
  }
};
