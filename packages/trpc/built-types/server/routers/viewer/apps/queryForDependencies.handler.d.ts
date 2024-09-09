import type { TrpcSessionUser } from "../../../trpc";
import type { TQueryForDependenciesInputSchema } from "./queryForDependencies.schema";
type QueryForDependenciesOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TQueryForDependenciesInputSchema;
};
export declare const queryForDependenciesHandler: ({ ctx, input }: QueryForDependenciesOptions) => Promise<{
    name: string;
    slug: string;
    installed: boolean;
}[] | undefined>;
export {};
