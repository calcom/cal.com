/// <reference types="react" />
import type { TFunction } from "next-i18next";
import type { BookerEvent } from "@calcom/features/bookings/types";
/** Render X mins as X hours or X hours Y mins instead of in minutes once >= 60 minutes */
export declare const getDurationFormatted: (mins: number | undefined, t: TFunction) => string | null;
export declare const EventDuration: ({ event, }: {
    event: Pick<BookerEvent, "length" | "metadata" | "isDynamic">;
}) => JSX.Element | null;
//# sourceMappingURL=Duration.d.ts.map