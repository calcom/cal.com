import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { ResourceResponse } from "@lib/types";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";
import { schemaResourcePublic } from "@lib/validations/resource";

/**
 * @swagger
 * /api/resources/{id}:
 *   get:
 *   summary: Get a resource by ID
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the resource to get
 *     tags:
 *     - resources
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Resource was not found
 */
export async function resourceById(req: NextApiRequest, res: NextApiResponse<ResourceResponse>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const resource = await prisma.resource.findUnique({ where: { id: safe.data.id } });
  const data = schemaResourcePublic.parse(resource);

  if (resource) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "Resource was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(resourceById));
