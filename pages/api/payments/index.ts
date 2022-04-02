import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { PaymentsResponse } from "@lib/types";
import { schemaPaymentPublic } from "@lib/validations/payment";

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get all payments
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
async function allPayments(_: NextApiRequest, res: NextApiResponse<PaymentsResponse>) {
  const payments = await prisma.payment.findMany();
  const data = payments.map((payment) => schemaPaymentPublic.parse(payment));

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No Payments were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allPayments);
