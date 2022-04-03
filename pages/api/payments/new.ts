import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { PaymentResponse } from "@lib/types";
import { schemaPaymentBodyParams, schemaPaymentPublic, withValidPayment } from "@lib/validations/payment";

/**
 * @swagger
 * /api/payments/new:
 *   post:
 *     summary: Creates a new payment
 *     requestBody:
 *       description: Optional description in *Markdown*
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *           $ref: '#/components/schemas/Payment'
 *     tags:
 *     - payments
 *     responses:
 *       201:
 *         description: OK, payment created
 *         model: Payment
 *       400:
 *        description: Bad request. Payment body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createPayment(req: NextApiRequest, res: NextApiResponse<PaymentResponse>) {
  const safe = schemaPaymentBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const payment = await prisma.payment.create({ data: safe.data });
  const data = schemaPaymentPublic.parse(payment);

  if (data) res.status(201).json({ data, message: "Payment created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new payment",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidPayment(createPayment));
