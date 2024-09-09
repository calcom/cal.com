import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../trpc";
import type { TGetTeamAndEventTypeOptionsSchema } from "./getTeamAndEventTypeOptions.schema";
type GetTeamAndEventTypeOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TGetTeamAndEventTypeOptionsSchema;
};
type Option = {
    value: string;
    label: string;
};
export declare const getTeamAndEventTypeOptions: ({ ctx, input }: GetTeamAndEventTypeOptions) => Promise<{
    eventTypeOptions: Option[];
    teamOptions: Option[];
}>;
export {};
