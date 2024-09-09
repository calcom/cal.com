import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type Options = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const getHandler: ({ ctx }: Options) => Promise<{
    teamGroupMapping: {
        id: number;
        name: string;
        slug: string | null;
        directoryId: string;
        groupNames: string[];
    }[];
}>;
export default getHandler;
