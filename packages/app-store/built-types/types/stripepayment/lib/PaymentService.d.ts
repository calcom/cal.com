import type { Booking, Payment, PaymentOption, Prisma } from "@prisma/client";
import z from "zod";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";
export declare const stripeCredentialKeysSchema: z.ZodObject<{
    stripe_user_id: z.ZodString;
    default_currency: z.ZodString;
    stripe_publishable_key: z.ZodString;
}, "strip", z.ZodTypeAny, {
    stripe_user_id: string;
    stripe_publishable_key: string;
    default_currency: string;
}, {
    stripe_user_id: string;
    stripe_publishable_key: string;
    default_currency: string;
}>;
export declare class PaymentService implements IAbstractPaymentService {
    private stripe;
    private credentials;
    constructor(credentials: {
        key: Prisma.JsonValue;
    });
    private getPayment;
    create(payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">, bookingId: Booking["id"], userId: Booking["userId"], username: string | null, bookerName: string, bookerEmail: string, paymentOption: PaymentOption, eventTitle?: string, bookingTitle?: string): Promise<{
        currency: string;
        paymentOption: import(".prisma/client").$Enums.PaymentOption | null;
        id: number;
        data: Prisma.JsonValue;
        uid: string;
        bookingId: number;
        appId: string | null;
        externalId: string;
        success: boolean;
        amount: number;
        fee: number;
        refunded: boolean;
    }>;
    collectCard(payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">, bookingId: Booking["id"], bookerEmail: string, paymentOption: PaymentOption): Promise<Payment>;
    chargeCard(payment: Payment, _bookingId?: Booking["id"]): Promise<Payment>;
    update(): Promise<Payment>;
    refund(paymentId: Payment["id"]): Promise<Payment>;
    afterPayment(event: CalendarEvent, booking: {
        user: {
            email: string | null;
            name: string | null;
            timeZone: string;
        } | null;
        id: number;
        startTime: {
            toISOString: () => string;
        };
        uid: string;
    }, paymentData: Payment, eventTypeMetadata?: EventTypeMetadata): Promise<void>;
    deletePayment(paymentId: Payment["id"]): Promise<boolean>;
    getPaymentPaidStatus(): Promise<string>;
    getPaymentDetails(): Promise<Payment>;
    isSetupAlready(): boolean;
}
//# sourceMappingURL=PaymentService.d.ts.map