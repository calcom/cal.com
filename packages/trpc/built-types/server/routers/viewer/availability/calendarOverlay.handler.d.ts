import type { EventBusyDate } from "@calcom/types/Calendar";
import type { TrpcSessionUser } from "../../../trpc";
import type { TCalendarOverlayInputSchema } from "./calendarOverlay.schema";
type ListOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TCalendarOverlayInputSchema;
};
export declare const calendarOverlayHandler: ({ ctx, input }: ListOptions) => Promise<EventBusyDate[]>;
export {};
