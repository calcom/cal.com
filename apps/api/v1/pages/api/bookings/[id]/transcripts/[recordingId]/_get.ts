import {
  checkIfRoomNameMatchesInRecording,
  getTranscriptsAccessLinkFromRecordingId,
} from "@calcom/features/conferencing/lib/videoClient";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { PartialReference } from "@calcom/types/EventManager";
import type { NextApiRequest } from "next";
import { getTranscriptFromRecordingId } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /bookings/{id}/transcripts/{recordingId}:
 *   get:
 *     summary: Find all Cal video transcripts of that recording
 *     operationId: getTranscriptsByRecordingId
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the booking for which transcripts need to be fetched.
 *       - in: path
 *         name: recordingId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the recording(daily.co recording id) for which transcripts need to be fetched.
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     tags:
 *     - bookings
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Authorization information is missing or invalid.
 *       404:
 *         description: Booking was not found
 */

export async function getHandler(req: NextApiRequest) {
  const { query } = req;
  const { id, recordingId } = getTranscriptFromRecordingId.parse(query);

  await checkIfRecordingBelongsToBooking(id, recordingId);

  const transcriptsAccessLinks = await getTranscriptsAccessLinkFromRecordingId(recordingId);

  return transcriptsAccessLinks;
}

const checkIfRecordingBelongsToBooking = async (bookingId: number, recordingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    // eslint-disable-next-line @calcom/eslint/no-prisma-include-true
    include: { references: true },
  });

  if (!booking)
    throw new HttpError({
      statusCode: 404,
      message: `No Booking found with booking id ${bookingId}`,
    });

  const roomName =
    booking?.references?.find((reference: PartialReference) => reference.type === "daily_video")?.meetingId ??
    undefined;

  if (!roomName)
    throw new HttpError({
      statusCode: 404,
      message: `No Booking Reference with Daily Video found with booking id ${bookingId}`,
    });

  const canUserAccessRecordingId = await checkIfRoomNameMatchesInRecording(roomName, recordingId);
  if (!canUserAccessRecordingId) {
    throw new HttpError({
      statusCode: 403,
      message: `This Recording Id ${recordingId} does not belong to booking ${bookingId}`,
    });
  }
};

export default defaultResponder(getHandler);
