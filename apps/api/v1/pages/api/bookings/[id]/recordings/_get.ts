import type { NextApiRequest } from "next";

import {
  getRecordingsOfCalVideoByRoomName,
  getDownloadLinkOfCalVideoByRecordingId,
} from "@calcom/features/conferencing/lib/videoClient";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { RecordingItemSchema } from "@calcom/prisma/zod-utils";
import type { PartialReference } from "@calcom/types/EventManager";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /bookings/{id}/recordings:
 *   get:
 *     summary: Find all Cal video recordings of that booking
 *     operationId: getRecordingsByBookingId
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the booking for which recordings need to be fetched. Recording download link is only valid for 12 hours and you would have to fetch the recordings again to get new download link
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ArrayOfRecordings"
 *             examples:
 *               recordings:
 *                 value:
 *                   - id: "ad90a2e7-154f-49ff-a815-5da1db7bf899"
 *                     room_name: "0n22w24AQ5ZFOtEKX2gX"
 *                     start_ts: 1716215386
 *                     status: "finished"
 *                     max_participants: 1
 *                     duration: 11
 *                     share_token: "x94YK-69Gnh7"
 *                     download_link: "https://daily-meeting-recordings..."
 *       401:
 *         description: Authorization information is missing or invalid.
 *       404:
 *         description: Booking was not found
 */

export async function getHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);

  const booking = await prisma.booking.findUnique({
    where: { id },
    // eslint-disable-next-line @calcom/eslint/no-prisma-include-true
    include: { references: true },
  });

  if (!booking)
    throw new HttpError({
      statusCode: 404,
      message: `No Booking found with booking id ${id}`,
    });

  const roomName =
    booking?.references?.find((reference: PartialReference) => reference.type === "daily_video")?.meetingId ??
    undefined;

  if (!roomName)
    throw new HttpError({
      statusCode: 404,
      message: `No Cal Video reference found with booking id ${booking.id}`,
    });

  const recordings = await getRecordingsOfCalVideoByRoomName(roomName);

  if (!recordings || !("data" in recordings)) return [];

  const recordingWithDownloadLink = recordings.data.map((recording: RecordingItemSchema) => {
    return getDownloadLinkOfCalVideoByRecordingId(recording.id)
      .then((res) => ({
        ...recording,
        download_link: res?.download_link,
      }))
      .catch((err) => ({ ...recording, download_link: null, error: err.message }));
  });
  const res = await Promise.all(recordingWithDownloadLink);
  return res;
}

export default defaultResponder(getHandler);
