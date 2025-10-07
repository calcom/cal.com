import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "~/lib/helpers/withMiddleware";
import type { PaymentsResponse } from "~/lib/types";
import { schemaPaymentPublic } from "~/lib/validations/payment";

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Find all payments
 *     tags:
 *     - payments
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments:
 *                   $ref: "#/components/schemas/ArrayOfPayments"
 *       401:
 *         description: Authorization information is missing or invalid.
 *
 */
async function allPayments({ userId }: NextApiRequest, res: NextApiResponse<PaymentsResponse>) {
  const userWithBookings = await prisma.user.findUnique({
    where: { id: userId },
    include: { bookings: true },
  });
  if (!userWithBookings) throw new Error("No user found");
  const bookings = userWithBookings.bookings;
  const bookingIds = bookings.map((booking) => booking.id);
  const data = await prisma.payment.findMany({ where: { bookingId: { in: bookingIds } } });
  const payments = data.map((payment) => schemaPaymentPublic.parse(payment));

  res.status(200).json({ payments });
}
// NO POST FOR PAYMENTS FOR NOW
export default withMiddleware("HTTP_GET")(allPayments);
