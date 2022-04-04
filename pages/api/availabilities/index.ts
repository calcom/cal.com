import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { AvailabilitiesResponse } from "@lib/types";
import { schemaAvailabilityPublic } from "@lib/validations/availability";

/**
 * @swagger
 * /api/availabilities:
 *   get:
 *     summary: Get all availabilities
 *     tags:
 *     - availabilities
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No availabilities were found
 */
async function allAvailabilities(_: NextApiRequest, res: NextApiResponse<AvailabilitiesResponse>) {
  const availabilities = await prisma.availability.findMany();
  const data = availabilities.map((availability) => schemaAvailabilityPublic.parse(availability));

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No Availabilities were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allAvailabilities);
