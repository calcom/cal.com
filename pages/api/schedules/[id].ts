import type { NextApiRequest, NextApiResponse } from "next";

import safeParseJSON from "@lib/helpers/safeParseJSON";
import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { ScheduleResponse } from "@lib/types";
import { schemaSingleScheduleBodyParams, schemaSchedulePublic } from "@lib/validations/schedule";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

export async function scheduleById(
  { method, query, body, userId, isAdmin, prisma }: NextApiRequest,
  res: NextApiResponse<ScheduleResponse>
) {
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaSingleScheduleBodyParams.safeParse(safeParseJSON(body));
  if (!safeBody.success) {
    res.status(400).json({ message: "Bad request" });
    return;
  }

  if (safeBody.data.userId && !isAdmin) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (!safeQuery.success) {
    res.status(400).json({ message: "Your query was invalid" });
    return;
  }
  const userSchedules = await prisma.schedule.findMany({ where: { userId: safeBody.data.userId || userId } });
  const userScheduleIds = userSchedules.map((schedule) => schedule.id);
  if (!userScheduleIds.includes(safeQuery.data.id)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  } else {
    switch (method) {
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
      case "GET":
        await prisma.schedule
          .findUnique({
            where: { id: safeQuery.data.id },
            include: { availability: true },
          })
          .then((data) => schemaSchedulePublic.parse(data))
          .then((schedule) => res.status(200).json({ schedule }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Schedule with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

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
       *         description: OK, schedule edited successfuly
       *       400:
       *        description: Bad request. Schedule body is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "PATCH":
        if (!safeBody.success) {
          {
            res.status(400).json({ message: "Invalid request body" });
            return;
          }
        }

        delete safeBody.data.userId;

        await prisma.schedule
          .update({ where: { id: safeQuery.data.id }, data: safeBody.data })
          .then((data) => schemaSchedulePublic.parse(data))
          .then((schedule) => res.status(200).json({ schedule }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Schedule with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

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
       *     tags:
       *     - schedules
       *     responses:
       *       201:
       *         description: OK, schedule removed successfuly
       *       400:
       *        description: Bad request. Schedule id is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "DELETE":
        // Look for user to check if schedule is user's default
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");
        if (user.defaultScheduleId === safeQuery.data.id) {
          // unset default
          await prisma.user.update({
            where: {
              id: userId,
            },
            data: {
              defaultScheduleId: undefined,
            },
          });
        }
        await prisma.schedule
          .delete({ where: { id: safeQuery.data.id } })
          .then(() =>
            res.status(200).json({
              message: `Schedule with id: ${safeQuery.data.id} deleted successfully`,
            })
          )
          .catch((error: Error) =>
            res.status(404).json({
              message: `Schedule with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      default:
        res.status(405).json({ message: "Method not allowed" });
        break;
    }
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(scheduleById));
