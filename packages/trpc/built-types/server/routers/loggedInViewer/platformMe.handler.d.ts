import type { Session } from "next-auth";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type MeOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        session: Session;
    };
};
export declare const platformMeHandler: ({ ctx }: MeOptions) => Promise<{
    id: number;
    username: string | null;
    email: string;
    timeFormat: number | null;
    timeZone: string;
    defaultScheduleId: number | null;
    weekStart: string;
    organizationId: number | null;
    organization: {
        isPlatform: any;
        id: number | null;
    };
}>;
export {};
