import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryUserId } from "@lib/validations/shared/queryUserId";
import { schemaUserEditBodyParams, schemaUserReadPublic } from "@lib/validations/user";

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Edit an existing user
 *     operationId: editUserById
 *     requestBody:
 *       description: Edit an existing attendee related to one of your bookings
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weekStart:
 *                 type: string
 *                 enum: [Monday, Sunday, Saturday]
 *                 example: Monday
 *               brandColor:
 *                 type: string
 *                 example: "#FF000F"
 *               darkBrandColor:
 *                 type: string
 *                 example: "#000000"
 *               timeZone:
 *                 type: string
 *                 example: Europe/London
 *     parameters:
 *      - in: path
 *        name: id
 *        example: 4
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the user to edit
 *     tags:
 *       - users
 *     responses:
 *       200:
 *         description: OK, user edited successfuly
 *       400:
 *         description: Bad request. User body is invalid.
 *       401:
 *         description: Authorization information is missing or invalid.
 *       403:
 *         description: Insufficient permissions to access resource.
 */
export async function patchHandler(req: NextApiRequest) {
  const { prisma, isAdmin } = req;
  const query = schemaQueryUserId.parse(req.query);
  // Here we only check for ownership of the user if the user is not admin, otherwise we let ADMIN's edit any user
  if (!isAdmin && query.userId !== req.userId) throw new HttpError({ statusCode: 403, message: "Forbidden" });

  const body = await schemaUserEditBodyParams.parseAsync(req.body);
  const userSchedules = await prisma.schedule.findMany({
    where: { userId: query.userId },
  });
  const userSchedulesIds = userSchedules.map((schedule) => schedule.id);
  // @note: here we make sure user can only make as default his own scheudles
  if (body.defaultScheduleId && !userSchedulesIds.includes(Number(body.defaultScheduleId))) {
    throw new HttpError({
      statusCode: 400,
      message: "Bad request: Invalid default schedule id",
    });
  }
  const data = await prisma.user.update({
    where: { id: query.userId },
    data: body,
  });
  const user = schemaUserReadPublic.parse(data);
  return { user };
}

export default defaultResponder(patchHandler);
