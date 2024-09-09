import type { Booking, Payment, PaymentOption, Prisma } from "@prisma/client";
import z from "zod";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";
export declare const paypalCredentialKeysSchema: z.ZodObject<{
    client_id: z.ZodString;
    secret_key: z.ZodString;
    webhook_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    secret_key: string;
    webhook_id: string;
}, {
    client_id: string;
    secret_key: string;
    webhook_id: string;
}>;
export declare class PaymentService implements IAbstractPaymentService {
    private credentials;
    constructor(credentials: {
        key: Prisma.JsonValue;
    });
    create(payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">, bookingId: Booking["id"]): Promise<{
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
    update(): Promise<Payment>;
    refund(): Promise<Payment>;
    collectCard(payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">, bookingId: number, _bookerEmail: string, paymentOption: PaymentOption): Promise<Payment>;
    chargeCard(): Promise<Payment>;
    getPaymentPaidStatus(): Promise<string>;
    getPaymentDetails(): Promise<Payment>;
    afterPayment(): Promise<void>;
    deletePayment(): Promise<boolean>;
    isSetupAlready(): boolean;
}
//# sourceMappingURL=PaymentService.d.ts.map