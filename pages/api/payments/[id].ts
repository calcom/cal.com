import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { PaymentResponse } from "@lib/types";
import { schemaPaymentBodyParams, schemaPaymentPublic } from "@lib/validations/payment";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get an payment by ID
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
 *   patch:
 *     summary: Edit an existing payment
 *     consumes:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: payment
 *        description: The payment to edit
 *        schema:
 *         type: object
 *         $ref: '#/components/schemas/Payment'
 *        required: true
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
 *   delete:
 *     summary: Remove an existing payment
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the payment to delete
 *     tags:
 *     - payments
 *     responses:
 *       201:
 *         description: OK, payment removed successfuly
 *         model: Payment
 *       400:
 *        description: Bad request. Payment id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function paymentById(req: NextApiRequest, res: NextApiResponse<PaymentResponse>) {
  const { method, query, body } = req;
  const safeQuery = await schemaQueryIdParseInt.safeParse(query);
  const safeBody = await schemaPaymentBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);

  switch (method) {
    case "GET":
      await prisma.payment
        .findUnique({ where: { id: safeQuery.data.id } })
        .then((payment) => schemaPaymentPublic.parse(payment))
        .then((data) => res.status(200).json({ data }))
        .catch((error: Error) =>
          res.status(404).json({ message: `Payment with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    case "PATCH":
      if (!safeBody.success) throw new Error("Invalid request body");
      await prisma.payment
        .update({
          where: { id: safeQuery.data.id },
          data: safeBody.data,
        })
        .then((payment) => schemaPaymentPublic.parse(payment))
        .then((data) => res.status(200).json({ data }))
        .catch((error: Error) =>
          res.status(404).json({ message: `Payment with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    case "DELETE":
      await prisma.payment
        .delete({ where: { id: safeQuery.data.id } })
        .then(() =>
          res.status(200).json({ message: `Payment with id: ${safeQuery.data.id} deleted successfully` })
        )
        .catch((error: Error) =>
          res.status(404).json({ message: `Payment with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    default:
      res.status(405).json({ message: "Method not allowed" });
      break;
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(paymentById));
