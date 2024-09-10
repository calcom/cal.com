import type { TrpcSessionUser } from "../../../trpc";
type ListOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const listHandler: ({ ctx }: ListOptions) => Promise<{
    length: number;
    id: number;
    title: string;
    slug: string;
    description: string | null;
    hidden: boolean;
    schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
    metadata: import(".prisma/client").Prisma.JsonValue;
}[]>;
export {};
