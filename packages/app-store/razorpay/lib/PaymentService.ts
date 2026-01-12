// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require("razorpay");
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { sendAwaitingPaymentEmailAndSMS } from "@calcom/emails/email-manager";
import { prisma } from "@calcom/prisma";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { Booking, Payment, PaymentOption, Prisma } from "@calcom/prisma/client";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import { createPaymentLink } from "./client";
import type { RazorpayPaymentData } from "./server";
import { appKeysSchema } from "../zod";

const log = logger.getSubLogger({ prefix: ["payment-service:razorpay"] });

export class PaymentService implements IAbstractPaymentService {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private razorpay: any;
    private credentials: z.infer<typeof appKeysSchema> | null;

    constructor(credentials: { key: Prisma.JsonValue }) {

        const keyParsing = appKeysSchema.safeParse(credentials.key);
        if (!keyParsing.success) {
            this.credentials = null;
        } else {
            this.credentials = keyParsing.data;
        }
        this.razorpay = new Razorpay({
            key_id: this.credentials?.key_id || "dummy",
            key_secret: this.credentials?.key_secret || "dummy",
        });
    }


    private async getPayment(where: Prisma.PaymentWhereInput) {
        const payment = await prisma.payment.findFirst({ where });
        if (!payment) {
            return null;
        }
        if (!payment.externalId) {
            throw new Error("Payment externalId not found");
        }
        return { ...payment, externalId: payment.externalId };
    }

    async create(
        payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
        bookingId: Booking["id"],
        userId: Booking["userId"],
        username: string | null,
        bookerName: string,
        paymentOption: PaymentOption,
        bookerEmail: string,
        bookerPhoneNumber?: string | null,
        eventTitle?: string,
        bookingTitle?: string
    ) {
        try {
            if (paymentOption !== "ON_BOOKING") {
                throw new Error("Payment option is not compatible with create method");
            }

            if (!this.credentials) {
                throw new Error("Razorpay credentials not found");
            }

            const amountInSmallestUnit = Math.round(payment.amount);

            const orderOptions = {
                amount: amountInSmallestUnit,
                currency: payment.currency.toUpperCase(),
                receipt: `rcpt_${uuidv4().split("-")[0]}`,
                notes: {
                    bookingId: bookingId.toString(),
                    userId: userId?.toString() || "",
                    username: username || "",
                    bookerName,
                    bookerEmail,
                    bookerPhoneNumber: bookerPhoneNumber || "",
                    eventTitle: eventTitle || "",
                    bookingTitle: bookingTitle || "",
                },
            };



            const order = await this.razorpay.orders.create(orderOptions);


            const paymentData = await prisma.payment.create({
                data: {
                    uid: uuidv4(),
                    app: {
                        connect: {
                            slug: "razorpay",
                        },
                    },
                    booking: {
                        connect: {
                            id: bookingId,
                        },
                    },
                    amount: payment.amount,
                    currency: payment.currency,
                    externalId: order.id,
                    data: {
                        orderId: order.id,
                        keyId: this.credentials.key_id,
                        amount: amountInSmallestUnit,
                        currency: order.currency,
                        receipt: order.receipt,
                    } as unknown as Prisma.InputJsonValue,
                    fee: 0,
                    refunded: false,
                    success: false,
                    paymentOption: paymentOption || "ON_BOOKING",
                },
            });

            return paymentData;
        } catch (error) {
            log.error("Razorpay: Payment could not be created", bookingId, safeStringify(error));
            throw new Error("payment_not_created_error");
        }
    }

    async collectCard(
        payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
        bookingId: Booking["id"],
        paymentOption: PaymentOption,
        bookerEmail: string,
        bookerPhoneNumber?: string | null
    ): Promise<Payment> {
        try {
            if (!this.credentials) {
                throw new Error("Razorpay credentials not found");
            }

            if (paymentOption !== "HOLD") {
                throw new Error("Payment option is not compatible with collectCard method");
            }

            const amountInSmallestUnit = Math.round(payment.amount);

            const orderOptions = {
                amount: amountInSmallestUnit,
                currency: payment.currency.toUpperCase(),
                receipt: `rcpt_hold_${uuidv4().split("-")[0]}`,
                payment_capture: 0,
                notes: {
                    bookingId: bookingId.toString(),
                    bookerEmail,
                    bookerPhoneNumber: bookerPhoneNumber || "",
                    paymentOption: "HOLD",
                },
            };

            const order = await this.razorpay.orders.create(orderOptions);

            const paymentData = await prisma.payment.create({
                data: {
                    uid: uuidv4(),
                    app: {
                        connect: {
                            slug: "razorpay",
                        },
                    },
                    booking: {
                        connect: {
                            id: bookingId,
                        },
                    },
                    amount: payment.amount,
                    currency: payment.currency,
                    externalId: order.id,
                    data: {
                        orderId: order.id,
                        keyId: this.credentials.key_id,
                        amount: amountInSmallestUnit,
                        currency: order.currency,
                        paymentOption: "HOLD",
                    } as unknown as Prisma.InputJsonValue,
                    fee: 0,
                    refunded: false,
                    success: false,
                    paymentOption: paymentOption,
                },
            });

            return paymentData;
        } catch (error) {
            log.error("Razorpay: Payment method could not be collected", bookingId, safeStringify(error));
            throw new Error("Razorpay: Payment method could not be collected");
        }
    }

    async chargeCard(payment: Payment, bookingId: Booking["id"]): Promise<Payment> {
        try {
            if (!this.credentials) {
                throw new Error("Razorpay credentials not found");
            }

            const paymentObject = payment.data as unknown as RazorpayPaymentData;

            if (!paymentObject.orderId) {
                throw new Error("Order ID not found in payment data");
            }

            const payments = await this.razorpay.orders.fetchPayments(paymentObject.orderId);

            if (!payments.items || payments.items.length === 0) {
                throw new Error("No payments found for this order");
            }

            const razorpayPayment = payments.items[0];

            if (razorpayPayment.status === "authorized") {
                await this.razorpay.payments.capture(
                    razorpayPayment.id,
                    paymentObject.amount,
                    payment.currency.toUpperCase()
                );
            }

            const paymentData = await prisma.payment.update({
                where: {
                    id: payment.id,
                },
                data: {
                    success: true,
                    data: {
                        ...paymentObject,
                        paymentId: razorpayPayment.id,
                        status: "captured",
                    } as unknown as Prisma.InputJsonValue,
                },
            });

            return paymentData;
        } catch (error) {
            log.error("Razorpay: Could not charge card for payment", bookingId, safeStringify(error));

            const errorMappings = {
                "payment failed": "payment_failed",
                "insufficient funds": "insufficient_funds",
                "card declined": "card_declined",
            };

            let userMessage = "could_not_charge_card";

            if (error instanceof Error) {
                const errorMessage = error.message.toLowerCase();

                for (const [key, message] of Object.entries(errorMappings)) {
                    if (errorMessage.includes(key)) {
                        userMessage = message;
                        break;
                    }
                }
            }

            throw new ErrorWithCode(ErrorCode.ChargeCardFailure, userMessage);
        }
    }

    async update(): Promise<Payment> {
        throw new Error("Method not implemented.");
    }

    async refund(paymentId: Payment["id"]): Promise<Payment | null> {
        const payment = await this.getPayment({
            id: paymentId,
        });

        if (!payment) {
            return null;
        }

        if (!payment.success) {
            throw new Error("Unable to refund failed payment");
        }

        if (payment.refunded) {
            return payment;
        }

        try {
            const paymentData = payment.data as unknown as RazorpayPaymentData;

            if (!paymentData.paymentId) {
                throw new Error("Payment ID not found for refund");
            }

            const refund = await this.razorpay.payments.refund(paymentData.paymentId, {
                amount: payment.amount,
            });

            if (!refund || refund.status === "failed") {
                throw new Error("Refund failed");
            }

            const updatedPayment = await prisma.payment.update({
                where: {
                    id: payment.id,
                },
                data: {
                    refunded: true,
                },
            });

            return updatedPayment;
        } catch (e) {
            const err = getErrorFromUnknown(e);
            throw err;
        }
    }

    async afterPayment(
        event: CalendarEvent,
        booking: {
            user: { email: string | null; name: string | null; timeZone: string } | null;
            id: number;
            startTime: { toISOString: () => string };
            uid: string;
        },
        paymentData: Payment,
        eventTypeMetadata?: EventTypeMetadata
    ): Promise<void> {
        const attendeesToEmail = event.attendeeSeatId
            ? event.attendees.filter((attendee) => attendee.bookingSeat?.referenceUid === event.attendeeSeatId)
            : event.attendees;

        await sendAwaitingPaymentEmailAndSMS(
            {
                ...event,
                attendees: attendeesToEmail,
                paymentInfo: {
                    link: createPaymentLink({
                        paymentUid: paymentData.uid,
                        name: booking.user?.name,
                        email: booking.user?.email,
                        date: booking.startTime.toISOString(),
                    }),
                    paymentOption: paymentData.paymentOption || "ON_BOOKING",
                    amount: paymentData.amount,
                    currency: paymentData.currency,
                },
            },
            eventTypeMetadata
        );
    }

    async deletePayment(paymentId: Payment["id"]): Promise<boolean> {
        try {
            const payment = await this.getPayment({
                id: paymentId,
            });

            if (!payment) {
                return false;
            }

            await prisma.payment.delete({
                where: {
                    id: paymentId,
                },
            });

            return true;
        } catch (e) {
            log.error("Razorpay: Unable to delete Payment", paymentId, safeStringify(e));
            return false;
        }
    }

    getPaymentPaidStatus(): Promise<string> {
        throw new Error("Method not implemented.");
    }

    getPaymentDetails(): Promise<Payment> {
        throw new Error("Method not implemented.");
    }

    isSetupAlready(): boolean {
        return !!this.credentials;
    }

    verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
        if (!this.credentials) {
            throw new Error("Razorpay credentials not found");
        }

        const body = `${orderId}|${paymentId}`;
        const expectedSignature = crypto
            .createHmac("sha256", this.credentials.key_secret)
            .update(body)
            .digest("hex");

        return expectedSignature === signature;
    }
}