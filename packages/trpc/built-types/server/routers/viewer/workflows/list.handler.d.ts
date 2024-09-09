import type { WorkflowType } from "@calcom/features/ee/workflows/components/WorkflowListPage";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TListInputSchema } from "./list.schema";
type ListOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TListInputSchema;
};
export declare const listHandler: ({ ctx, input }: ListOptions) => Promise<{
    workflows: WorkflowType[];
}>;
export {};
