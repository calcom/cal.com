import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { AttendeeResponse, AttendeesResponse } from "@lib/types";
import { schemaAttendeeCreateBodyParams, schemaAttendeeReadPublic } from "@lib/validations/attendee";

/**
 * @swagger
 * /attendees:
 *   get:
 *     summary: Find all attendees
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - attendees
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No attendees were found
 *   post:
 *     summary: Creates a new attendee
 *     security:
 *       - ApiKeyAuth: []
 *     consumes:
 *       - application/json
 *     requestBody:
 *       description: Create a new attendee related to one of your bookings
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - name
 *               - email
 *               - timeZone
 *             properties:
 *               bookingId:
 *                 type: number
 *                 example: 1
 *               email:
 *                 type: string
 *                 example: email@example.com
 *               name:
 *                 type: string
 *                 example: John Doe
 *               timeZone:
 *                 type: string
 *                 example: Europe/London
 *     tags:
 *     - attendees
 *     responses:
 *       201:
 *         description: OK, attendee created
 *         model: Attendee
 *       400:
 *        description: Bad request. Attendee body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createOrlistAllAttendees(
  req: NextApiRequest,
  res: NextApiResponse<AttendeesResponse | AttendeeResponse>
) {
  const { method, userId } = req;
  // Here we make sure to only return attendee's of the user's own bookings.
  const userBookings = await prisma.booking.findMany({
    where: {
      userId,
    },
    include: {
      attendees: true,
    },
  });
  const attendees = userBookings.map((booking) => booking.attendees).flat();
  if (method === "GET") {
    if (attendees) res.status(200).json({ attendees });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No Attendees were found",
          error,
        });
  } else if (method === "POST") {
    const safePost = schemaAttendeeCreateBodyParams.safeParse(req.body);
    if (!safePost.success) {
      console.log(safePost.error);
      res.status(400).json({ error: safePost.error });
      throw new Error("Invalid request body", safePost.error);
    }
    const userId = req.userId;
    const userWithBookings = await prisma.user.findUnique({
      where: { id: userId },
      include: { bookings: true },
    });
    if (!userWithBookings) {
      throw new Error("User not found");
    }
    const userBookingIds = userWithBookings.bookings.map((booking: any) => booking.id).flat();
    // Here we make sure to only return attendee's of the user's own bookings.
    if (!userBookingIds.includes(safePost.data.bookingId)) res.status(401).json({ message: "Unauthorized" });
    else {
      const data = await prisma.attendee.create({
        data: {
          email: safePost.data.email,
          name: safePost.data.name,
          timeZone: safePost.data.timeZone,
          booking: { connect: { id: safePost.data.bookingId } },
        },
      });
      const attendee = schemaAttendeeReadPublic.parse(data);

      if (attendee) {
        res.status(201).json({
          attendee,
          message: "Attendee created successfully",
        });
      } else {
        (error: Error) =>
          res.status(400).json({
            message: "Could not create new attendee",
            error,
          });
      }
    }
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllAttendees);
