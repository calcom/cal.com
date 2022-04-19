import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { AvailabilityResponse } from "@lib/types";
import { getCalcomUserId } from "@lib/utils/getCalcomUserId";
import { schemaAvailabilityBodyParams, schemaAvailabilityPublic } from "@lib/validations/availability";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /v1/availabilities/{id}:
 *   get:
 *     summary: Get an availability by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the availability to get
 *     security:
 *       - ApiKeyAuth: []
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
 *     consumes:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: availability
 *        description: The availability to edit
 *        schema:
 *         type: object
 *         $ref: '#/components/schemas/Availability'
 *        required: true
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the availability to edit
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - availabilities
 *     externalDocs:
 *        url: https://docs.cal.com/availability
 *     responses:
 *       201:
 *         description: OK, availability edited successfuly
 *         model: Availability
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
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - availabilities
 *     externalDocs:
 *        url: https://docs.cal.com/availability
 *     responses:
 *       201:
 *         description: OK, availability removed successfuly
 *         model: Availability
 *       400:
 *        description: Bad request. Availability id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function availabilityById(req: NextApiRequest, res: NextApiResponse<AvailabilityResponse>) {
  const { method, query, body } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaAvailabilityBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  const userId = await getCalcomUserId(res);
  const data = await prisma.availability.findMany({ where: { userId } });
  const availabiltiesIds = data.map((availability) => availability.id);
  if (availabiltiesIds.includes(safeQuery.data.id)) {
    switch (method) {
      case "GET":
        await prisma.availability
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaAvailabilityPublic.parse(data))
          .then((availability) => res.status(200).json({ availability }))
          .catch((error: Error) =>
            res.status(404).json({ message: `Availability with id: ${safeQuery.data.id} not found`, error })
          );
        break;

      case "PATCH":
        if (!safeBody.success) throw new Error("Invalid request body");
        await prisma.availability
          .update({
            where: { id: safeQuery.data.id },
            data: safeBody.data,
          })
          .then((data) => schemaAvailabilityPublic.parse(data))
          .then((availability) => res.status(200).json({ availability }))
          .catch((error: Error) =>
            res.status(404).json({ message: `Availability with id: ${safeQuery.data.id} not found`, error })
          );
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
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(availabilityById));
