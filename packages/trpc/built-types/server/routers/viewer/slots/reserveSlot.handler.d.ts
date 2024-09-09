import type { NextApiRequest, NextApiResponse } from "next";
import type { PrismaClient } from "@calcom/prisma";
import type { TReserveSlotInputSchema } from "./reserveSlot.schema";
interface ReserveSlotOptions {
    ctx: {
        prisma: PrismaClient;
        req?: NextApiRequest | undefined;
        res?: NextApiResponse | undefined;
    };
    input: TReserveSlotInputSchema;
}
export declare const reserveSlotHandler: ({ ctx, input }: ReserveSlotOptions) => Promise<{
    uid: string;
}>;
export {};
