import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { prisma } from "@calcom/prisma";
import logger from "@calcom/lib/logger";
import { RazorpayCredentials } from "../lib/types";
import { verifyRequestSchema } from "../zod";
const log = logger.getSubLogger({ prefix: ["razorpay-verify"] });


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }
    try {
        const parseRequest = verifyRequestSchema.safeParse(req.body);
        if (!parseRequest.success) {
            return res.status(400).json({ message: "Invalid request" });
        }
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, paymentUid } = parseRequest.data;

        const payment = await prisma.payment.findFirst({
            where: { uid: paymentUid },
            select: {
                id: true,
                externalId: true,
                booking: {
                    select: {
                        uid: true,
                        userId: true,
                        user: {
                            select: {
                                credentials: {
                                    where: {
                                        type: "razorpay_payment",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!payment) {
            log.error("Payment not found", { paymentUid });
            return res.status(404).json({ message: "Payment not found" });
        }

        if (payment.externalId !== razorpay_order_id) {
            log.error("Order ID mismatch", {
                paymentUid,
                expectedOrderId: payment.externalId,
                providedOrderId: razorpay_order_id
            });
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const credentials = payment.booking?.user?.credentials?.[0];
        if (!credentials) {
            log.error("Razorpay credentials not found", { paymentUid });
            return res.status(500).json({ message: "Credentials not found" });
        }
        const razorpayCredentials = credentials.key as unknown as RazorpayCredentials;
        const keySecret = razorpayCredentials.key_secret;

        if (keySecret && razorpay_signature) {
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", keySecret)
                .update(body)
                .digest("hex");
            if (expectedSignature !== razorpay_signature) {
                log.error("Invalid payment signature", { paymentUid });
                return res.status(400).json({ message: "Invalid signature" });
            }
        }

        return res.status(200).json({
            success: true,
            bookingUid: payment.booking?.uid,
        });
    } catch (error) {
        log.error("Verification error:", error);
        return res.status(500).json({ message: "Verification failed" });
    }
}