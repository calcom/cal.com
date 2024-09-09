import type { EventType, Prisma } from "@prisma/client";
import type z from "zod";
import type { bookingResponsesDbSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
export declare const getCalEventResponses: ({ bookingFields, booking, responses, }: {
    bookingFields: z.infer<typeof eventTypeBookingFields> | EventType["bookingFields"] | null;
    booking?: {
        location: string | null;
        description: string | null;
        customInputs: Prisma.JsonValue;
        responses: Prisma.JsonValue;
        attendees: {
            name: string;
            email: string;
        }[];
    } | undefined;
    responses?: Record<string, string | boolean | string[] | Record<string, string> | {
        value: string;
        optionValue: string;
    }> | undefined;
}) => {
    userFieldsResponses: import("@calcom/types/Calendar").CalEventResponses;
    responses: import("@calcom/types/Calendar").CalEventResponses;
};
//# sourceMappingURL=getCalEventResponses.d.ts.map