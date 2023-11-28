import type { NextApiRequest, NextApiResponse } from "next";

import { withMiddleware } from "~/lib/helpers/withMiddleware";
import type { PaymentResponse } from "~/lib/types";
import { schemaPaymentPublic } from "~/lib/validations/payment";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Find a payment
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the payment to get
 *     tags:
 *     - payments
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Payment was not found
 */
export async function paymentById(
  { method, query, userId, prisma }: NextApiRequest,
  res: NextApiResponse<PaymentResponse>
) {
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  if (safeQuery.success && method === "GET") {
    const userWithBookings = await prisma.user.findUnique({
      where: { id: userId },
      include: { bookings: true },
    });
    await prisma.payment
      .findUnique({ where: { id: safeQuery.data.id } })
      .then((data) => schemaPaymentPublic.parse(data))
      .then((payment) => {
        if (!userWithBookings?.bookings.map((b) => b.id).includes(payment.bookingId)) {
          res.status(401).json({ message: "Unauthorized" });
        } else {
          res.status(200).json({ payment });
        }
      })
      .catch((error: Error) =>
        res.status(404).json({
          message: `Payment with id: ${safeQuery.data.id} not found`,
          error,
        })
      );
  }
}
export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(paymentById));
