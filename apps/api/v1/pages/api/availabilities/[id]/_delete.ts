import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

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
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: integer
 *        description: Your API key
 *     tags:
 *     - availabilities
 *     externalDocs:
 *        url: https://docs.cal.com/docs/core-features/availability
 *     responses:
 *       201:
 *         description: OK, availability removed successfully
 *       400:
 *        description: Bad request. Availability id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  await prisma.availability.delete({ where: { id } });
  return { message: `Availability with id: ${id} deleted successfully` };
}

export default defaultResponder(deleteHandler);
