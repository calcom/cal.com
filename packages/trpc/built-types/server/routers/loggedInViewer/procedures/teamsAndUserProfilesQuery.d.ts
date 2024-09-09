export declare const teamsAndUserProfilesQuery: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
    input: {
        includeOrg?: boolean | undefined;
    } | undefined;
    output: ({
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
    })[];
}>;
