import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TTeamsAndUserProfilesQueryInputSchema } from "./teamsAndUserProfilesQuery.schema";
type TeamsAndUserProfileOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TTeamsAndUserProfilesQueryInputSchema;
};
export declare const teamsAndUserProfilesQuery: ({ ctx, input }: TeamsAndUserProfileOptions) => Promise<({
    teamId: number;
    name: string;
    slug: string | null;
    image: string;
    role: import(".prisma/client").$Enums.MembershipRole;
    readOnly: boolean;
} | {
    teamId: null;
    name: string | null;
    slug: string | null;
    image: string;
    readOnly: boolean;
})[]>;
export {};
