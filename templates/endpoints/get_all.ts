import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { ResourcesResponse } from "@lib/types";
import { schemaResourcePublic } from "@lib/validations/resource";

/**
 * @swagger
 * /v1/resources:
 *   get:
 *     summary: Get all resources
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - resources
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No resources were found
 */
async function allResources(_: NextApiRequest, res: NextApiResponse<ResourcesResponse>) {
  const resources = await prisma.resource.findMany();
  const data = resources.map((resource) => schemaResourcePublic.parse(resource));

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No Resources were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allResources);
