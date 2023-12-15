import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

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
 *        example: 201
 *        required: true
 *        description: ID of the availability to delete
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        example: 1234abcd5678efgh
 *        description: Your API key
 *     tags:
 *     - availabilities
 *     externalDocs:
 *        url: https://docs.cal.com/availability
 *     responses:
 *       200:
 *         description: OK, availability removed successfully
 *       400:
 *        description: Bad request. Availability id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *        $ref: "#/components/responses/ErrorUnauthorized"
 */
export async function deleteHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  await prisma.availability.delete({ where: { id } });
  return { message: `Availability with id: ${id} deleted successfully` };
}

export default defaultResponder(deleteHandler);
