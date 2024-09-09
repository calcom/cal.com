import type { PrismaClient } from "@calcom/prisma";
import type { TFindInputSchema } from "./find.schema";
type GetOptions = {
    ctx: {
        prisma: PrismaClient;
    };
    input: TFindInputSchema;
};
export declare const getHandler: ({ ctx, input }: GetOptions) => Promise<{
    booking: {
        status: import(".prisma/client").$Enums.BookingStatus;
        id: number;
        uid: string;
        eventTypeId: number | null;
        description: string | null;
        startTime: Date;
        endTime: Date;
        paid: boolean;
    } | null;
}>;
export {};
