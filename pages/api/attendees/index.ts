import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { AttendeeResponse, AttendeesResponse } from "@lib/types";
import { getCalcomUserId } from "@lib/utils/getCalcomUserId";
import { schemaAttendeeBodyParams, schemaAttendeePublic, withValidAttendee } from "@lib/validations/attendee";

/**
 * @swagger
 * /v1/attendees:
 *   get:
 *     summary: Get all attendees
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
  const { method } = req;
  const userId = getCalcomUserId(res);
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
    const safe = schemaAttendeeBodyParams.safeParse(req.body);
    if (!safe.success) {
      throw new Error("Invalid request body", safe.error);
    }
    const bookingId = safe.data.bookingId;
    const userId = await getCalcomUserId(res);
    const userWithBookings = await prisma.user.findUnique({
      where: { id: userId },
      include: { bookings: true },
    });
    if (!userWithBookings) {
      throw new Error("User not found");
    }
    const userBookingIds = userWithBookings.bookings.map((booking: any) => booking.id).flat();
    if (userBookingIds.includes(bookingId)) {
      delete safe.data.bookingId;
      const noBookingId = safe.data;
      const data = await prisma.attendee.create({
        data: {
          ...noBookingId,
          booking: { connect: { id: bookingId } },
        },
      });
      const attendee = schemaAttendeePublic.parse(data);

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
    } else res.status(401).json({ message: "Unauthorized" });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllAttendees);
