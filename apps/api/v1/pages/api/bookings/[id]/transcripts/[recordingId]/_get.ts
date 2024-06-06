import type { NextApiRequest } from "next";

import { getTranscriptsAccessLinkFromRecordingId } from "@calcom/core/videoClient";
import { defaultResponder } from "@calcom/lib/server";

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
 *         description: ID of the rocording for which transcripts need to be fetched.
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
 *       401:
 *         description: Authorization information is missing or invalid.
 *       404:
 *         description: Booking was not found
 */

export async function getHandler(req: NextApiRequest) {
  const { query } = req;
  const { recordingId } = getTranscriptFromRecordingId.parse(query);

  const transcriptsAccessLinks = await getTranscriptsAccessLinkFromRecordingId(recordingId);

  return transcriptsAccessLinks;
}

export default defaultResponder(getHandler);
