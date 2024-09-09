import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TGetAllActiveWorkflowsInputSchema } from "./getAllActiveWorkflows.schema";
type GetAllActiveWorkflowsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetAllActiveWorkflowsInputSchema;
};
export declare const getAllActiveWorkflowsHandler: ({ input, ctx }: GetAllActiveWorkflowsOptions) => Promise<import("@calcom/ee/workflows/lib/types").Workflow[]>;
export {};
