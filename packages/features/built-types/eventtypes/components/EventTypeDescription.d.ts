/// <reference types="react" />
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { baseEventTypeSelect } from "@calcom/prisma";
import type { EventTypeModel } from "@calcom/prisma/zod";
export type EventTypeDescriptionProps = {
    eventType: Pick<z.infer<typeof EventTypeModel>, Exclude<keyof typeof baseEventTypeSelect, "recurringEvent"> | "metadata" | "seatsPerTimeSlot"> & {
        descriptionAsSafeHTML?: string | null;
        recurringEvent: Prisma.JsonValue;
    };
    className?: string;
    shortenDescription?: boolean;
    isPublic?: boolean;
};
export declare const EventTypeDescription: ({ eventType, className, shortenDescription, isPublic, }: EventTypeDescriptionProps) => JSX.Element;
export default EventTypeDescription;
//# sourceMappingURL=EventTypeDescription.d.ts.map