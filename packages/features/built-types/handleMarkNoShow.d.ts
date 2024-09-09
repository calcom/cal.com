import type { TNoShowInputSchema } from "@calcom/trpc/server/routers/loggedInViewer/markNoShow.schema";
declare const handleMarkNoShow: ({ bookingUid, attendees, noShowHost, userId, locale, }: {
    bookingUid: string;
    attendees?: {
        email: string;
        noShow: boolean;
    }[] | undefined;
    noShowHost?: boolean | undefined;
} & {
    userId?: number | undefined;
    locale?: string | undefined;
}) => Promise<{
    attendees: {
        email: string;
        noShow: boolean;
    }[];
    noShowHost: boolean;
    message: string;
}>;
export default handleMarkNoShow;
//# sourceMappingURL=handleMarkNoShow.d.ts.map