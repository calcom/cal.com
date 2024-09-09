/// <reference types="react" />
type Attendee = {
    id: number;
    email: string;
    name: string;
    timeZone: string;
    locale: string | null;
    bookingId: number | null;
};
interface MeetingTimeInTimezonesProps {
    attendees: Attendee[];
    userTimezone?: string;
    timeFormat?: number | null;
    startTime: string;
    endTime: string;
}
declare const MeetingTimeInTimezones: {
    ({ attendees, userTimezone, timeFormat, startTime, endTime, }: MeetingTimeInTimezonesProps): JSX.Element | null;
    displayName: string;
};
export default MeetingTimeInTimezones;
//# sourceMappingURL=MeetingTimeInTimezones.d.ts.map