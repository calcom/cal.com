import type { PrismaClient } from "@calcom/prisma";
import type { TInstantBookingInputSchema } from "./getInstantBookingLocation.schema";
type GetOptions = {
    ctx: {
        prisma: PrismaClient;
    };
    input: TInstantBookingInputSchema;
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
        location: string | null;
        metadata: import(".prisma/client").Prisma.JsonValue;
    } | null;
}>;
export {};
