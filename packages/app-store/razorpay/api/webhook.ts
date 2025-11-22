import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import logger from "@calcom/lib/logger";

import type {
    RazorpayWebhookEvent,
    RazorpayPaymentEntity,
    RazorpayRefundEntity,
    RazorpayCredentials,
    RazorpayPaymentStorageData
} from "../lib/types";
import { webhookEventSchema } from "../zod";

const log = logger.getSubLogger({ prefix: ["razorpay-webhook"] });

const processedWebhooks = new Set<string>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        const signature = req.headers["x-razorpay-signature"] as string;

        if (!signature) {
            log.error("Missing webhook signature");
            return res.status(400).json({ message: "Missing signature" });
        }

        const body = JSON.stringify(req.body);

        const event = webhookEventSchema.parse(req.body) as unknown as RazorpayWebhookEvent;

        const webhookId = `${event.event}_${event.created_at}_${event.account_id}`;
        if (processedWebhooks.has(webhookId)) {
            log.info("Duplicate webhook received, skipping", { webhookId });
            return res.status(200).json({ received: true, duplicate: true });
        }

        let webhookSecret: string | null = null;
        let orderId: string | null = null;

        if (event.payload?.payment?.entity?.order_id) {
            orderId = event.payload.payment.entity.order_id;
        } else if (event.payload?.refund?.entity?.payment_id) {
            const paymentId = event.payload.refund.entity.payment_id;
            const payment = await prisma.payment.findFirst({
                where: {
                    data: {
                        path: ["paymentId"],
                        equals: paymentId,
                    },
                },
                select: {
                    externalId: true,
                    booking: {
                        include: {
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

            if (payment?.externalId) {
                orderId = payment.externalId;
                if (payment.booking?.user?.credentials?.[0]) {
                    const credentials = payment.booking.user.credentials[0]
                        .key as unknown as RazorpayCredentials;
                    webhookSecret = credentials.webhook_secret || null;
                }
            }
        } else if (event.payload?.order?.entity?.id) {
            orderId = event.payload.order.entity.id;
        }

        if (orderId && !webhookSecret) {
            const payment = await prisma.payment.findFirst({
                where: { externalId: orderId },
                select: {
                    booking: {
                        include: {
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

            if (payment?.booking?.user?.credentials?.[0]) {
                const credentials = payment.booking.user.credentials[0]
                    .key as unknown as RazorpayCredentials;
                webhookSecret = credentials.webhook_secret || null;
            }
        }

        if (!webhookSecret) {
            // eslint-disable-next-line turbo/no-undeclared-env-vars
            webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || null;
            if (webhookSecret) {
                log.warn("Using global webhook secret as fallback", {
                    event: event.event,
                    orderId,
                    accountId: event.account_id,
                });
            }
        }

        if (!webhookSecret) {
            log.error("Webhook secret not found", {
                event: event.event,
                orderId,
                accountId: event.account_id,
            });
            return res.status(500).json({ message: "Webhook secret not configured" });
        }

        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(body)
            .digest("hex");

        if (signature !== expectedSignature) {
            log.error("Invalid webhook signature", {
                event: event.event,
                orderId,
                accountId: event.account_id,
            });
            return res.status(400).json({ message: "Invalid signature" });
        }

        res.status(200).json({ received: true });

        processedWebhooks.add(webhookId);

        if (processedWebhooks.size > 1000) {
            const entries = Array.from(processedWebhooks);
            entries.slice(0, 100).forEach((id) => processedWebhooks.delete(id));
        }

        const processPromise = processWebhookEvent(event);

        await processPromise;

    } catch (error) {
        log.error("Webhook error:", error);
        return res.status(500).json({ message: "Webhook processing failed" });
    }
}

async function processWebhookEvent(event: RazorpayWebhookEvent) {
    switch (event.event) {
        case "payment.captured":
            if (event.payload.payment?.entity) {
                await handlePaymentCaptured(event.payload.payment.entity);
            }
            break;
        case "payment.authorized":
            if (event.payload.payment?.entity) {
                await handlePaymentAuthorized(event.payload.payment.entity);
            }
            break;
        case "payment.failed":
            if (event.payload.payment?.entity) {
                await handlePaymentFailed(event.payload.payment.entity);
            }
            break;
        case "refund.processed":
            if (event.payload.refund?.entity) {
                await handleRefundProcessed(event.payload.refund.entity);
            }
            break;
        case "refund.failed":
            if (event.payload.refund?.entity) {
                await handleRefundFailed(event.payload.refund.entity);
            }
            break;
        default:
            log.info("Unhandled webhook event type:", event.event);
    }
}

async function handlePaymentCaptured(paymentEntity: RazorpayPaymentEntity) {
    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    if (!orderId) {
        log.warn("Payment captured without order_id", { paymentId });
        return;
    }

    log.info("Processing payment.captured", { orderId, paymentId });

    const payment = await prisma.payment.findFirst({
        where: { externalId: orderId },
    });

    if (!payment) {
        log.warn("Payment not found for order", { orderId, paymentId });
        return;
    }

    const existingData = payment.data as unknown as RazorpayPaymentStorageData;

    if (existingData?.status === "captured" && payment.success) {
        log.info("Payment already captured, skipping update", {
            orderId,
            paymentId,
            paymentDbId: payment.id,
        });
        return;
    }

    const updateData: RazorpayPaymentStorageData = {
        ...existingData,
        paymentId,
        status: "captured",
        capturedAt: new Date().toISOString(),
        amount: paymentEntity.amount,
        currency: paymentEntity.currency,
    };

    await prisma.$transaction([
        prisma.payment.update({
            where: { id: payment.id },
            data: {
                success: true,
                data: updateData as unknown as Prisma.InputJsonValue,
            },
        }),
        prisma.booking.update({
            where: { id: payment.bookingId },
            data: { paid: true },
        }),
    ]);

    log.info("Payment captured successfully", {
        orderId,
        paymentId,
        paymentDbId: payment.id,
    });
}

async function handlePaymentAuthorized(paymentEntity: RazorpayPaymentEntity) {
    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    if (!orderId) {
        log.warn("Payment authorized without order_id", { paymentId });
        return;
    }

    log.info("Processing payment.authorized", { orderId, paymentId });

    const payment = await prisma.payment.findFirst({
        where: { externalId: orderId },
    });

    if (!payment) {
        log.warn("Payment not found for order", { orderId, paymentId });
        return;
    }

    const existingData = payment.data as unknown as RazorpayPaymentStorageData;

    if (existingData?.status === "captured") {
        log.info("Payment already captured, skipping authorized update", {
            orderId,
            paymentId,
            paymentDbId: payment.id,
        });
        return;
    }

    const updateData: RazorpayPaymentStorageData = {
        ...existingData,
        paymentId,
        status: "authorized",
        authorizedAt: new Date().toISOString(),
        amount: paymentEntity.amount,
        currency: paymentEntity.currency,
    };

    await prisma.payment.update({
        where: { id: payment.id },
        data: {
            data: updateData as unknown as Prisma.InputJsonValue,
        },
    });

    log.info("Payment authorized successfully", {
        orderId,
        paymentId,
        paymentDbId: payment.id,
    });
}

async function handlePaymentFailed(paymentEntity: RazorpayPaymentEntity) {
    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    if (!orderId) {
        log.warn("Payment failed without order_id", { paymentId });
        return;
    }

    log.info("Processing payment.failed", {
        orderId,
        paymentId,
        errorCode: paymentEntity.error_code,
        errorDescription: paymentEntity.error_description,
    });

    const payment = await prisma.payment.findFirst({
        where: { externalId: orderId },
    });

    if (!payment) {
        log.warn("Payment not found for order", { orderId, paymentId });
        return;
    }

    if (payment.success) {
        log.warn("Ignoring failed event for successful payment", {
            orderId,
            paymentId,
            paymentDbId: payment.id,
        });
        return;
    }

    const existingData = payment.data as unknown as RazorpayPaymentStorageData;

    const updateData: RazorpayPaymentStorageData = {
        ...existingData,
        paymentId,
        status: "failed",
        errorCode: paymentEntity.error_code,
        errorDescription: paymentEntity.error_description,
        errorSource: paymentEntity.error_source,
        errorStep: paymentEntity.error_step,
        errorReason: paymentEntity.error_reason,
        failedAt: new Date().toISOString(),
    };

    await prisma.payment.update({
        where: { id: payment.id },
        data: {
            success: false,
            data: updateData as unknown as Prisma.InputJsonValue,
        },
    });

    log.info("Payment marked as failed", {
        orderId,
        paymentId,
        paymentDbId: payment.id,
        errorCode: paymentEntity.error_code,
    });
}

async function handleRefundProcessed(refundEntity: RazorpayRefundEntity) {
    const paymentId = refundEntity.payment_id;
    const refundId = refundEntity.id;

    log.info("Processing refund.processed", { paymentId, refundId });

    const payment = await prisma.payment.findFirst({
        where: {
            data: {
                path: ["paymentId"],
                equals: paymentId,
            },
        },
    });

    if (!payment) {
        log.warn("Payment not found for refund", { paymentId, refundId });
        return;
    }

    if (payment.refunded) {
        log.info("Payment already marked as refunded", {
            paymentId,
            refundId,
            paymentDbId: payment.id,
        });
        return;
    }

    if (refundEntity.status === "processed") {
        const existingData = payment.data as unknown as RazorpayPaymentStorageData;

        const updateData: RazorpayPaymentStorageData = {
            ...existingData,
            refundId: refundId,
            refundAmount: refundEntity.amount,
            refundStatus: "processed",
            refundedAt: new Date().toISOString(),
        };

        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                refunded: true,
                data: updateData as unknown as Prisma.InputJsonValue,
            },
        });

        log.info("Refund processed successfully", {
            paymentId,
            refundId,
            paymentDbId: payment.id,
            refundAmount: refundEntity.amount,
        });
    }
}

async function handleRefundFailed(refundEntity: RazorpayRefundEntity) {
    const paymentId = refundEntity.payment_id;
    const refundId = refundEntity.id;

    log.error("Refund failed", {
        paymentId,
        refundId,
        status: refundEntity.status,
    });

    const payment = await prisma.payment.findFirst({
        where: {
            data: {
                path: ["paymentId"],
                equals: paymentId,
            },
        },
    });

    if (payment) {
        const existingData = payment.data as unknown as RazorpayPaymentStorageData;

        const updateData: RazorpayPaymentStorageData = {
            ...existingData,
            refundId: refundId,
            refundStatus: "failed",
            refundFailedAt: new Date().toISOString(),
        };

        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                data: updateData as unknown as Prisma.InputJsonValue,
            },
        });
    }
}