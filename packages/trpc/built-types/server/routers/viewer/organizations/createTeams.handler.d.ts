import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateTeamsSchema } from "./createTeams.schema";
type CreateTeamsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TCreateTeamsSchema;
};
export declare const createTeamsHandler: ({ ctx, input }: CreateTeamsOptions) => Promise<{
    duplicatedSlugs: string[];
}>;
export default createTeamsHandler;
