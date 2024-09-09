import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
declare const userCanCreateTeamGroupMapping: (user: NonNullable<TrpcSessionUser>, organizationId: number | null, teamId?: number) => Promise<{
    organizationId: number;
}>;
export default userCanCreateTeamGroupMapping;
//# sourceMappingURL=userCanCreateTeamGroupMapping.d.ts.map