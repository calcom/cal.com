import type { Payment } from "@calcom/prisma/client";
export declare function getClientSecretFromPayment(payment: Omit<Partial<Payment>, "data"> & {
    data: Record<string, unknown>;
}): string;
//# sourceMappingURL=getClientSecretFromPayment.d.ts.map