import { BookingReferenceRepository } from "@calcom/features/bookingReference/repositories/BookingReferenceRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import {
  deleteRecordingOfCalVideoByRecordingId,
  getRecordingsOfCalVideoByRoomName,
} from "@calcom/features/conferencing/lib/videoClient";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteCalVideoRecordingInputSchema } from "./deleteCalVideoRecording.schema";

type DeleteCalVideoRecordingHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteCalVideoRecordingInputSchema;
};

export const deleteCalVideoRecordingHandler = async ({
  input,
  ctx,
}: DeleteCalVideoRecordingHandlerOptions) => {
  const { recordingId, roomName } = input;
  const { user } = ctx;

  // Get booking reference from room name
  const bookingReference = await BookingReferenceRepository.findDailyVideoReferenceByRoomName({ roomName });

  if (!bookingReference?.bookingId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Booking not found for this recording",
    });
  }

  // Verify user has access to this booking
  const bookingAccessService = new BookingAccessService(prisma);
  const hasAccess = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: user.id,
    bookingId: bookingReference.bookingId,
  });

  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have access to delete this recording",
    });
  }

  // Verify the recordingId belongs to this room (prevents IDOR attack)
  const recordings = await getRecordingsOfCalVideoByRoomName(roomName);
  const recordingBelongsToRoom =
    recordings && "data" in recordings && recordings.data?.some((r) => r.id === recordingId);

  if (!recordingBelongsToRoom) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Recording not found in this room",
    });
  }

  try {
    const res = await deleteRecordingOfCalVideoByRecordingId(recordingId);
    return res;
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Failed to delete recording",
    });
  }
};
