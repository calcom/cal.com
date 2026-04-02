import { getAllTranscriptsAccessLinkFromRoomName } from "@calcom/features/conferencing/lib/videoClient";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { PartialReference } from "@calcom/types/EventManager";
import type { NextApiRequest } from "next";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /bookings/{id}/transcripts:
 *   get:
 *     summary: Find all Cal video transcripts of that booking
 *     operationId: getTranscriptsByBookingId
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the booking for which recordings need to be fetched.
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

  const transcripts = await getAllTranscriptsAccessLinkFromRoomName(roomName);

  return transcripts;
}

export default defaultResponder(getHandler);
