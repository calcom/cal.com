/// <reference types="@calcom/types/ical" />
import ICAL from "ical.js";
import type { Calendar, IntegrationCalendar, EventBusyDate, CalendarEvent, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
export default class ICSFeedCalendarService implements Calendar {
    private urls;
    private skipWriting;
    protected integrationName: string;
    constructor(credential: CredentialPayload);
    createEvent(_event: CalendarEvent, _credentialId: number): Promise<NewCalendarEventType>;
    deleteEvent(_uid: string, _event: CalendarEvent, _externalCalendarId?: string): Promise<unknown>;
    updateEvent(_uid: string, _event: CalendarEvent, _externalCalendarId?: string): Promise<NewCalendarEventType | NewCalendarEventType[]>;
    fetchCalendars: () => Promise<{
        url: string;
        vcalendar: ICAL.Component;
    }[]>;
    /**
     * getUserTimezoneFromDB() retrieves the timezone of a user from the database.
     *
     * @param {number} id - The user's unique identifier.
     * @returns {Promise<string | undefined>} - A Promise that resolves to the user's timezone or "Europe/London" as a default value if the timezone is not found.
     */
    getUserTimezoneFromDB: (id: number) => Promise<string | undefined>;
    /**
     * getUserId() extracts the user ID from the first calendar in an array of IntegrationCalendars.
     *
     * @param {IntegrationCalendar[]} selectedCalendars - An array of IntegrationCalendars.
     * @returns {number | null} - The user ID associated with the first calendar in the array, or null if the array is empty or the user ID is not found.
     */
    getUserId: (selectedCalendars: IntegrationCalendar[]) => number | null;
    getAvailability(dateFrom: string, dateTo: string, selectedCalendars: IntegrationCalendar[]): Promise<EventBusyDate[]>;
    listCalendars(): Promise<IntegrationCalendar[]>;
}
//# sourceMappingURL=CalendarService.d.ts.map