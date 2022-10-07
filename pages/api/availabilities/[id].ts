import type { NextApiRequest, NextApiResponse } from "next";

import safeParseJSON from "@lib/helpers/safeParseJSON";
import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { AvailabilityResponse } from "@lib/types";
import {
  schemaAvailabilityEditBodyParams,
  schemaAvailabilityReadPublic,
  schemaSingleAvailabilityReadBodyParams,
} from "@lib/validations/availability";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

export async function availabilityById(
  { method, query, body, userId, isAdmin, prisma }: NextApiRequest,
  res: NextApiResponse<AvailabilityResponse>
) {
  body = safeParseJSON(body);
  if (body.success !== undefined && !body.success) {
    res.status(400).json({ message: body.message });
    return;
  }

  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  if (!safeQuery.success) {
    res.status(400).json({ message: "Your query is invalid", error: safeQuery.error });
    return;
  }

  const safe = schemaSingleAvailabilityReadBodyParams.safeParse(body);
  if (!safe.success) {
    res.status(400).json({ message: "Bad request" });
    return;
  }

  const safeBody = safe.data;

  if (safeBody.userId && !isAdmin) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const data = await prisma.schedule.findMany({
    where: { userId: safeBody.userId || userId },
    select: {
      availability: true,
    },
  });

  const availabilitiesArray = data.flatMap((schedule) => schedule.availability);

  if (!availabilitiesArray.some((availability) => availability.id === safeQuery.data.id)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  } else {
    switch (method) {
      /**
       * @swagger
       * /availabilities/{id}:
       *   get:
       *     operationId: getAvailabilityById
       *     summary: Find an availability
       *     parameters:
       *       - in: path
       *         name: id
       *         schema:
       *           type: integer
       *         required: true
       *         description: ID of the availability to get
       *     tags:
       *     - availabilities
       *     externalDocs:
       *        url: https://docs.cal.com/availability
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *        description: Unathorized
       */
      case "GET":
        await prisma.availability
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaAvailabilityReadPublic.parse(data))
          .then((availability) => res.status(200).json({ availability }))
          .catch((error: Error) =>
            res.status(404).json({ message: `Availability with id: ${safeQuery.data.id} not found`, error })
          );
        break;
      /**
       * @swagger
       * /availabilities/{id}:
       *   patch:
       *     operationId: editAvailabilityById
       *     summary: Edit an existing availability
       *     requestBody:
       *       description: Edit an existing availability related to one of your bookings
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *             properties:
       *               days:
       *                 type: array
       *                 example: email@example.com
       *               startTime:
       *                 type: string
       *                 example: 1970-01-01T17:00:00.000Z
       *               endTime:
       *                 type: string
       *                 example: 1970-01-01T17:00:00.000Z
       *     parameters:
       *      - in: path
       *        name: id
       *        schema:
       *          type: integer
       *        required: true
       *        description: ID of the availability to edit
       *     tags:
       *     - availabilities
       *     externalDocs:
       *        url: https://docs.cal.com/availability
       *     responses:
       *       201:
       *         description: OK, availability edited successfuly
       *       400:
       *        description: Bad request. Availability body is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "PATCH":
        const safeBody = schemaAvailabilityEditBodyParams.safeParse(body);
        if (!safeBody.success) {
          console.log(safeBody.error);
          res.status(400).json({ message: "Bad request" + safeBody.error, error: safeBody.error });
          return;
        }
        const userEventTypes = await prisma.eventType.findMany({ where: { userId } });
        const userEventTypesIds = userEventTypes.map((event) => event.id);
        if (safeBody.data.eventTypeId && !userEventTypesIds.includes(safeBody.data.eventTypeId)) {
          res.status(401).json({
            message: `Bad request. You're not the owner of eventTypeId: ${safeBody.data.eventTypeId}`,
          });
        }
        await prisma.availability
          .update({
            where: { id: safeQuery.data.id },
            data: safeBody.data,
          })
          .then((data) => schemaAvailabilityReadPublic.parse(data))
          .then((availability) => res.status(200).json({ availability }))
          .catch((error: Error) => {
            res.status(404).json({
              message: `Availability with id: ${safeQuery.data.id} not found`,
              error,
            });
          });
        break;
      /**
       * @swagger
       * /availabilities/{id}:
       *   delete:
       *     operationId: removeAvailabilityById
       *     summary: Remove an existing availability
       *     parameters:
       *      - in: path
       *        name: id
       *        schema:
       *          type: integer
       *        required: true
       *        description: ID of the availability to delete
       *     tags:
       *     - availabilities
       *     externalDocs:
       *        url: https://docs.cal.com/availability
       *     responses:
       *       201:
       *         description: OK, availability removed successfuly
       *       400:
       *        description: Bad request. Availability id is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "DELETE":
        await prisma.availability
          .delete({ where: { id: safeQuery.data.id } })
          .then(() =>
            res
              .status(200)
              .json({ message: `Availability with id: ${safeQuery.data.id} deleted successfully` })
          )
          .catch((error: Error) =>
            res.status(404).json({ message: `Availability with id: ${safeQuery.data.id} not found`, error })
          );
        break;

      default:
        res.status(405).json({ message: "Method not allowed" });
        break;
    }
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(availabilityById));
