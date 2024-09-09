/// <reference types="react" />
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
interface BookerSeoProps {
    username: string;
    eventSlug: string;
    rescheduleUid: string | undefined;
    hideBranding?: boolean;
    isSEOIndexable?: boolean;
    isTeamEvent?: boolean;
    entity: {
        fromRedirectOfNonOrgLink: boolean;
        orgSlug?: string | null;
        teamSlug?: string | null;
        name?: string | null;
    };
    bookingData?: GetBookingType | null;
}
export declare const BookerSeo: (props: BookerSeoProps) => JSX.Element;
export {};
//# sourceMappingURL=BookerSeo.d.ts.map