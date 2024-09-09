/// <reference types="react" />
import type { TFunction } from "next-i18next";
import "@calcom/dayjs/locales";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import type { RecurringEvent } from "@calcom/types/Calendar";
export declare function getRecurringWhen({ recurringEvent, attendee, }: {
    recurringEvent?: RecurringEvent | null;
    attendee: Pick<Person, "language">;
}): string;
export declare function WhenInfo(props: {
    calEvent: CalendarEvent;
    timeZone: string;
    t: TFunction;
    locale: string;
    timeFormat: TimeFormat;
}): JSX.Element;
//# sourceMappingURL=WhenInfo.d.ts.map