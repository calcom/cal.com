import type { DateRange } from "@calcom/lib/date-ranges";
import type { TrpcSessionUser } from "../../../../trpc";
import type { TListTeamAvailaiblityScheme } from "./listTeamAvailability.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TListTeamAvailaiblityScheme;
};
export declare const listTeamAvailabilityHandler: ({ ctx, input }: GetOptions) => Promise<{
    rows: ({
        id: number;
        organizationId: number | null;
        name: string | null;
        username: string | null;
        email: string;
        timeZone: string;
        role: import(".prisma/client").$Enums.MembershipRole;
        defaultScheduleId: number;
        dateRanges: DateRange[];
        avatarUrl?: undefined;
        profile?: undefined;
    } | {
        id: number;
        username: string | null;
        email: string;
        avatarUrl: string | null;
        profile: import("@calcom/types/UserProfile").UserProfile;
        organizationId: number | null;
        name: string | null;
        timeZone: string;
        role: import(".prisma/client").$Enums.MembershipRole;
        defaultScheduleId: number;
        dateRanges: DateRange[];
    })[];
    nextCursor: number | undefined;
    meta: {
        totalRowCount: number;
    };
}>;
export {};
