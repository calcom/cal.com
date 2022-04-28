import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { ResourceResponse } from "@lib/types";
import { schemaResourceBodyParams, schemaResourcePublic, withValidResource } from "@lib/validations/resource";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /v1/resources/{id}/edit:
 *   patch:
 *     summary: Edit an existing resource
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the resource to edit
 
 *     tags:
 *     - resources
 *     responses:
 *       201:
 *         description: OK, resource edited successfuly
 *       400:
 *        description: Bad request. Resource body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editResource(req: NextApiRequest, res: NextApiResponse<ResourceResponse>) {
  const safeQuery = schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = schemaResourceBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const resource = await prisma.resource.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaResourcePublic.parse(resource);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(
  withValidQueryIdTransformParseInt(withValidResource(editResource))
);
