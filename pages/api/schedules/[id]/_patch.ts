import type { NextApiRequest } from "next";
import type { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaSchedulePublic, schemaSingleScheduleBodyParams } from "~/lib/validations/schedule";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /schedules/{id}:
 *   patch:
 *     operationId: editScheduleById
 *     summary: Edit an existing schedule
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the schedule to edit
 *     tags:
 *     - schedules
 *     responses:
 *       201:
 *         description: OK, schedule edited successfully
 *       400:
 *        description: Bad request. Schedule body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const data = schemaSingleScheduleBodyParams.parse(req.body);
  await checkPermissions(req, data);
  const result = await prisma.schedule.update({ where: { id }, data, include: { availability: true } });
  return { schedule: schemaSchedulePublic.parse(result) };
}

async function checkPermissions(req: NextApiRequest, body: z.infer<typeof schemaSingleScheduleBodyParams>) {
  const { isAdmin } = req;
  if (isAdmin) return;
  if (body.userId) {
    throw new HttpError({ statusCode: 403, message: "Non admin cannot change the owner of a schedule" });
  }
  //_auth-middleware takes care of verifying the ownership of schedule.
}

export default defaultResponder(patchHandler);
