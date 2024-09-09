/// <reference types="react" />
import type { TFunction } from "next-i18next";
import { BaseEmailHtml } from "../components";
export type MonthlyDigestEmailData = {
    language: TFunction;
    Created: number;
    Completed: number;
    Rescheduled: number;
    Cancelled: number;
    mostBookedEvents: {
        eventTypeId?: number | null;
        eventTypeName?: string | null;
        count?: number | null;
    }[];
    membersWithMostBookings: {
        userId: number | null;
        user: {
            id: number;
            name: string | null;
            email: string;
            avatar: string | null;
            username: string | null;
        };
        count: number;
    }[];
    admin: {
        email: string;
        name: string;
    };
    team: {
        name: string;
        id: number;
    };
};
export declare const MonthlyDigestEmail: (props: MonthlyDigestEmailData & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => JSX.Element;
//# sourceMappingURL=MonthlyDigestEmail.d.ts.map