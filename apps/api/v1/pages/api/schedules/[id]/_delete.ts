import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /schedules/{id}:
 *   delete:
 *     operationId: removeScheduleById
 *     summary: Remove an existing schedule
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the schedule to delete
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API Key
 *     tags:
 *     - schedules
 *     responses:
 *       201:
 *         description: OK, schedule removed successfully
 *       400:
 *        description: Bad request. Schedule id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);

  /* If we're deleting any default user schedule, we unset it */
  await prisma.user.updateMany({ where: { defaultScheduleId: id }, data: { defaultScheduleId: undefined } });

  await prisma.schedule.delete({ where: { id } });
  return { message: `Schedule with id: ${id} deleted successfully` };
}

export default defaultResponder(deleteHandler);
