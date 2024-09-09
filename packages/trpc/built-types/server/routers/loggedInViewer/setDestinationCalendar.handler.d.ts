import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TSetDestinationCalendarInputSchema } from "./setDestinationCalendar.schema";
type SessionUser = NonNullable<TrpcSessionUser>;
type User = {
    id: SessionUser["id"];
    selectedCalendars: SessionUser["selectedCalendars"];
};
type SetDestinationCalendarOptions = {
    ctx: {
        user: User;
    };
    input: TSetDestinationCalendarInputSchema;
};
export declare const setDestinationCalendarHandler: ({ ctx, input }: SetDestinationCalendarOptions) => Promise<void>;
export {};
