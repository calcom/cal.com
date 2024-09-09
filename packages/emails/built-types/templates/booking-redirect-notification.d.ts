import type { TFunction } from "next-i18next";
import BaseEmail from "./_base-email";
export interface IBookingRedirect {
    language: TFunction;
    fromEmail: string;
    eventOwner: string;
    toEmail: string;
    toName: string;
    oldDates?: string;
    dates: string;
    action: "add" | "update" | "cancel";
}
export default class BookingRedirectNotification extends BaseEmail {
    bookingRedirect: IBookingRedirect;
    constructor(bookingRedirect: IBookingRedirect);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=booking-redirect-notification.d.ts.map