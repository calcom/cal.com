import type { Calendar, CalendarEvent, EventBusyDate, IntegrationCalendar, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
export type BasecampToken = {
    projectId: number;
    expires_at: number;
    expires_in: number;
    scheduleId: number;
    access_token: string;
    refresh_token: string;
    account: {
        id: number;
        href: string;
        name: string;
        hidden: boolean;
        product: string;
        app_href: string;
    };
};
export default class BasecampCalendarService implements Calendar {
    private credentials;
    private auth;
    private headers;
    private userAgent;
    protected integrationName: string;
    private accessToken;
    private scheduleId;
    private userId;
    private projectId;
    private log;
    constructor(credential: CredentialPayload);
    private basecampAuth;
    private getBasecampDescription;
    createEvent(event: CalendarEvent): Promise<NewCalendarEventType>;
    updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType | NewCalendarEventType[]>;
    deleteEvent(uid: string): Promise<void>;
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
    isValidFormat: (url: string) => boolean;
    getAvailability(_dateFrom: string, _dateTo: string, _selectedCalendars: IntegrationCalendar[]): Promise<EventBusyDate[]>;
    listCalendars(_event?: CalendarEvent): Promise<IntegrationCalendar[]>;
}
//# sourceMappingURL=CalendarService.d.ts.map