import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { ResourceResponse } from "@lib/types";
import { schemaResourceBodyParams, schemaResourcePublic, withValidResource } from "@lib/validations/resource";

/**
 * @swagger
 * /v1/resources/new:
 *   post:
 *     summary: Creates a new resource
 *   requestBody:
 *     description: Optional description in *Markdown*
 *     required: true
 *     content:
 *       application/json:
 *           schema:
 *           $ref: '#/components/schemas/Resource'
 
 *     tags:
 *     - resources
 *     responses:
 *       201:
 *         description: OK, resource created
 *       400:
 *        description: Bad request. Resource body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createResource({ body }: NextApiRequest, res: NextApiResponse<ResourceResponse>) {
  const safe = schemaResourceBodyParams.safeParse(body);
  if (!safe.success) throw new Error("Invalid request body");

  const resource = await prisma.resource.create({ data: safe.data });
  const data = schemaResourcePublic.parse(resource);

  if (data) res.status(201).json({ data, message: "Resource created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new resource",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidResource(createResource));
