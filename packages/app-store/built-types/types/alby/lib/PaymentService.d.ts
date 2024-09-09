import type { Booking, Payment, PaymentOption, Prisma } from "@prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";
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
    collectCard(_payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">, _bookingId: number, _bookerEmail: string, _paymentOption: PaymentOption): Promise<Payment>;
    chargeCard(_payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">, _bookingId: number): Promise<Payment>;
    getPaymentPaidStatus(): Promise<string>;
    getPaymentDetails(): Promise<Payment>;
    afterPayment(_event: CalendarEvent, _booking: {
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
    }, _paymentData: Payment): Promise<void>;
    deletePayment(_paymentId: number): Promise<boolean>;
    isSetupAlready(): boolean;
}
//# sourceMappingURL=PaymentService.d.ts.map