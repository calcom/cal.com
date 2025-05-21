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
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No payments were found
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

  if (payments) res.status(200).json({ payments });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No Payments were found",
        error,
      });
}
// NO POST FOR PAYMENTS FOR NOW
export default withMiddleware("HTTP_GET")(allPayments);
