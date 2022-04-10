import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { PaymentResponse } from "@lib/types";
import { getCalcomUserId } from "@lib/utils/getCalcomUserId";
import { schemaPaymentPublic } from "@lib/validations/payment";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get a payment by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the payment to get
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
export async function paymentById(req: NextApiRequest, res: NextApiResponse<PaymentResponse>) {
  const { method, query } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const userId = await getCalcomUserId(res);

  if (safeQuery.success && method === "GET") {
    const userWithBookings = await prisma.user.findUnique({
      where: { id: userId },
      include: { bookings: true },
    });
    await prisma.payment
      .findUnique({ where: { id: safeQuery.data.id } })
      .then((payment) => schemaPaymentPublic.parse(payment))
      .then((data) => {
        if (userWithBookings?.bookings.map((b) => b.id).includes(data.bookingId)) {
          res.status(200).json({ data });
        } else {
          res.status(401).json({ message: "Unauthorized" });
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
