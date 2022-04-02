import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { AvailabilitysResponse } from "@lib/types";
import { schemaAvailabilityPublic } from "@lib/validations/availability";

/**
 * @swagger
 * /api/availabilites:
 *   get:
 *     summary: Get all availabilites
 *     tags:
 *     - availabilites
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No availabilites were found
 */
async function allAvailabilitys(_: NextApiRequest, res: NextApiResponse<AvailabilitysResponse>) {
  const availabilites = await prisma.availability.findMany();
  const data = availabilites.map((availability) => schemaAvailabilityPublic.parse(availability));

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No Availabilitys were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allAvailabilitys);
