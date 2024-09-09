import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../trpc";
import type { TChargeCardInputSchema } from "./chargeCard.schema";
interface ChargeCardHandlerOptions {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TChargeCardInputSchema;
}
export declare const chargeCardHandler: ({ ctx, input }: ChargeCardHandlerOptions) => Promise<{
    id: number;
    uid: string;
    appId: string | null;
    bookingId: number;
    amount: number;
    fee: number;
    currency: string;
    success: boolean;
    refunded: boolean;
    data: import(".prisma/client").Prisma.JsonValue;
    externalId: string;
    paymentOption: import(".prisma/client").$Enums.PaymentOption | null;
}>;
export {};
