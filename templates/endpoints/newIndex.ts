import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { PaymentResponse, PaymentsResponse } from "@lib/types";
import { schemaPaymentBodyParams, schemaPaymentPublic, withValidPayment } from "@lib/validations/payment";

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
 *   post:
 *     summary: Creates a new payment
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
async function createOrlistAllPayments(
  req: NextApiRequest,
  res: NextApiResponse<PaymentsResponse | PaymentResponse>
) {
  const { method } = req;
  if (method === "GET") {
    const payments = await prisma.payment.findMany();
    const data = payments.map((payment) => schemaPaymentPublic.parse(payment));
    if (data) res.status(200).json({ data });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No Payments were found",
          error,
        });
  } else if (method === "POST") {
    const safe = schemaPaymentBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");

    const payment = await prisma.payment.create({ data: safe.data });
    const data = schemaPaymentPublic.parse(payment);

    if (data) res.status(201).json({ data, message: "Payment created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new payment",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllPayments);
