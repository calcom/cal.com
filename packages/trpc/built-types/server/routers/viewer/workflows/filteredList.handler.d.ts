import type { WorkflowType } from "@calcom/ee/workflows/components/WorkflowListPage";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TFilteredListInputSchema } from "./filteredList.schema";
type FilteredListOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TFilteredListInputSchema;
};
export declare const filteredListHandler: ({ ctx, input }: FilteredListOptions) => Promise<{
    filtered: WorkflowType[];
    totalCount: number;
} | undefined>;
export {};
