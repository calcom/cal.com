import type { Prisma } from "@prisma/client";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../trpc";
import type { TListLocalInputSchema } from "./listLocal.schema";
type ListLocalOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TListLocalInputSchema;
};
export declare const listLocalHandler: ({ ctx, input }: ListLocalOptions) => Promise<({
    name: string;
    slug: string;
    logo: string;
    title: string | undefined;
    type: `${string}_other` | `${string}_calendar` | `${string}_messaging` | `${string}_payment` | `${string}_video` | `${string}_automation` | `${string}_analytics` | `${string}_crm` | `${string}_other_calendar`;
    description: string;
    keys: Prisma.JsonObject | null;
    dirName: string;
    enabled: boolean;
    isTemplate: boolean | undefined;
} | {
    name: string;
    slug: string;
    logo: string;
    type: `${string}_other` | `${string}_calendar` | `${string}_messaging` | `${string}_payment` | `${string}_video` | `${string}_automation` | `${string}_analytics` | `${string}_crm` | `${string}_other_calendar`;
    title: string | undefined;
    description: string;
    enabled: boolean;
    dirName: string;
    keys: Record<string, string> | null;
    isTemplate?: undefined;
})[]>;
export {};
