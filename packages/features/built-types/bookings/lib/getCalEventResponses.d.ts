import type { EventType, Prisma } from "@prisma/client";
import type z from "zod";
import type { bookingResponsesDbSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
export declare const getCalEventResponses: ({ bookingFields, booking, responses, }: {
    bookingFields: z.infer<typeof eventTypeBookingFields> | EventType["bookingFields"] | null;
    booking?: {
        description: string | null;
        attendees: {
            name: string;
            email: string;
        }[];
        customInputs: Prisma.JsonValue;
        responses: Prisma.JsonValue;
        location: string | null;
    } | undefined;
    responses?: Record<string, string | boolean | string[] | {
        value: string;
        optionValue: string;
    } | Record<string, string>> | undefined;
}) => {
    userFieldsResponses: import("@calcom/types/Calendar").CalEventResponses;
    responses: import("@calcom/types/Calendar").CalEventResponses;
};
//# sourceMappingURL=getCalEventResponses.d.ts.map