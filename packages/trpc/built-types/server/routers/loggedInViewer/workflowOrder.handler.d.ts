import type { TFormSchema } from "@calcom/app-store/routing-forms/trpc/forms.schema";
import { Prisma } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TWorkflowOrderInputSchema } from "./workflowOrder.schema";
type RoutingFormOrderOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TWorkflowOrderInputSchema;
};
export declare const workflowOrderHandler: ({ ctx, input }: RoutingFormOrderOptions) => Promise<void>;
type SupportedFilters = Omit<NonNullable<NonNullable<TFormSchema>["filters"]>, "upIds"> | undefined;
export declare function getPrismaWhereFromFilters(user: {
    id: number;
}, filters: SupportedFilters): {
    OR: Prisma.App_RoutingForms_FormWhereInput[];
};
export {};
