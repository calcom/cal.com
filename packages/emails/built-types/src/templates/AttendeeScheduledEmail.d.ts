/// <reference types="react" />
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { BaseScheduledEmail } from "./BaseScheduledEmail";
export declare const AttendeeScheduledEmail: (props: {
    calEvent: CalendarEvent;
    attendee: Person;
} & Partial<React.ComponentProps<typeof BaseScheduledEmail>>) => JSX.Element;
//# sourceMappingURL=AttendeeScheduledEmail.d.ts.map