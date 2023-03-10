import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaSchedulePublic } from "~/lib/validations/schedule";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /schedules/{id}:
 *   get:
 *     operationId: getScheduleById
 *     summary: Find a schedule
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the schedule to get
 *       - in: query
 *         name: apiKey
 *         schema:
 *           type: string
 *         required: true
 *         description: Your API Key
 *     tags:
 *     - schedules
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Schedule was not found
 */
export async function getHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const data = await prisma.schedule.findUniqueOrThrow({ where: { id }, include: { availability: true } });
  return { schedule: schemaSchedulePublic.parse(data) };
}

export default defaultResponder(getHandler);
