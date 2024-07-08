import type { NextApiRequest } from "next";

import handleMarkNoShow from "@calcom/features/handleMarkNoShow";
import { defaultResponder } from "@calcom/lib/server";
import { ZNoShowInputSchema } from "@calcom/trpc/server/routers/publicViewer/noShow.schema";

/**
 * @swagger
 * /no-show:
 *   post:
 *     operationId: markNoShow
 *     summary: Mark attendee or organizer as no-show
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     requestBody:
 *       description: Mark attendee or organizer as no-show
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *              - scheduleId
 *              - startTime
 *              - endTime
 *             properties:
 *               attendees:
 *                 type: array
 *                 description: Array of attendees
 *                 items:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       description: Email of attendee
 *                     noShow:
 *                       type: boolean
 *                       description: Whether attendee is no-show
 *               bookingUid:
 *                 type: string
 *                 description: Uid of booking
 *     tags:
 *     - no-show
 *     responses:
 *       200:
 *         description: OK. No-show status updated
 *       400:
 *        description: Bad request. Availability body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *       500:
 *        description: Internal server error. Failed to update no-show status
 */
async function postHandler(req: NextApiRequest) {
  const data = ZNoShowInputSchema.parse(req.body);

  const { bookingUid, attendees } = data;

  const markNoShowResponse = await handleMarkNoShow({ bookingUid, attendees });

  return markNoShowResponse;
}

export default defaultResponder(postHandler);
