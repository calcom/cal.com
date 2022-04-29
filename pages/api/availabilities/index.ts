import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { AvailabilityResponse, AvailabilitiesResponse } from "@lib/types";
import {
  schemaAvailabilityCreateBodyParams,
  schemaAvailabilityReadPublic,
} from "@lib/validations/availability";

async function createOrlistAllAvailabilities(
  { method, userId }: NextApiRequest,
  res: NextApiResponse<AvailabilitiesResponse | AvailabilityResponse>
) {
  if (method === "GET") {
    /**
     * @swagger
     * /availabilities:
     *   get:
     *     summary: Find all availabilities
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
     *         description: No availabilities were found
     */
    const data = await prisma.availability.findMany({ where: { userId } });
    const availabilities = data.map((availability) => schemaAvailabilityReadPublic.parse(availability));
    if (availabilities) res.status(200).json({ availabilities });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No Availabilities were found",
          error,
        });
  } else if (method === "POST") {
    /**
     * @swagger
     * /availabilities:
     *   post:
     *     summary: Creates a new availability
     *     tags:
     *     - availabilities
     *     externalDocs:
     *        url: https://docs.cal.com/availability
     *     responses:
     *       201:
     *         description: OK, availability created
     *       400:
     *        description: Bad request. Availability body is invalid.
     *       401:
     *        description: Authorization information is missing or invalid.
     */
    const safe = schemaAvailabilityCreateBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");

    const data = await prisma.availability.create({ data: { ...safe.data, userId } });
    const availability = schemaAvailabilityReadPublic.parse(data);

    if (availability) res.status(201).json({ availability, message: "Availability created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new availability",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllAvailabilities);
