import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { AvailabilityResponse } from "@lib/types";
import {
  schemaAvailabilityEditBodyParams,
  schemaAvailabilityReadPublic,
} from "@lib/validations/availability";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /availabilities/{id}:
 *   get:
 *     summary: Find an availability by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the availability to get

 *     tags:
 *     - availabilities
 *     externalDocs:
 *        url: https://docs.cal.com/availability
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Availability was not found
 *   patch:
 *     summary: Edit an existing availability
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the availability to edit

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
 *   delete:
 *     summary: Remove an existing availability
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the availability to delete

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
export async function availabilityById(req: NextApiRequest, res: NextApiResponse<AvailabilityResponse>) {
  const { method, query, body } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  const userId = req.userId;
  const data = await prisma.availability.findMany({ where: { userId } });
  const availabiltiesIds = data.map((availability) => availability.id);
  if (!availabiltiesIds.includes(safeQuery.data.id)) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      case "GET":
        await prisma.availability
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaAvailabilityReadPublic.parse(data))
          .then((availability) => res.status(200).json({ availability }))
          .catch((error: Error) =>
            res.status(404).json({ message: `Availability with id: ${safeQuery.data.id} not found`, error })
          );
        break;

      case "PATCH":
        const safeBody = schemaAvailabilityEditBodyParams.safeParse(body);
        if (!safeBody.success) throw new Error("Invalid request body");
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
            console.log(error);
            res.status(404).json({
              message: `Availability with id: ${safeQuery.data.id} not found`,
              error,
            });
          });
        break;

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
