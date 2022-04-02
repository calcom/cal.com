import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { PaymentResponse } from "@lib/types";
import { schemaPaymentBodyParams, schemaPaymentPublic, withValidPayment } from "@lib/validations/payment";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/payments/{id}/edit:
 *   patch:
 *     summary: Edit an existing payment
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the payment to edit
 *     tags:
 *     - payments
 *     responses:
 *       201:
 *         description: OK, payment edited successfuly
 *         model: Payment
 *       400:
 *        description: Bad request. Payment body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editPayment(req: NextApiRequest, res: NextApiResponse<PaymentResponse>) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaPaymentBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const payment = await prisma.payment.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaPaymentPublic.parse(payment);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(withValidQueryIdTransformParseInt(withValidPayment(editPayment)));
