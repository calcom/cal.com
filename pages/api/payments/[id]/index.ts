import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { PaymentResponse } from "@lib/types";
import { schemaPaymentPublic } from "@lib/validations/payment";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *   summary: Get a payment by ID
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the payment to get
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
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const payment = await prisma.payment.findUnique({ where: { id: safe.data.id } });
  const data = schemaPaymentPublic.parse(payment);

  if (payment) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "Payment was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(paymentById));
