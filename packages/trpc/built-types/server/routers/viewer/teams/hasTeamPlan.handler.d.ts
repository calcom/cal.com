import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type HasTeamPlanOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const hasTeamPlanHandler: ({ ctx }: HasTeamPlanOptions) => Promise<{
    hasTeamPlan: boolean;
}>;
export default hasTeamPlanHandler;
