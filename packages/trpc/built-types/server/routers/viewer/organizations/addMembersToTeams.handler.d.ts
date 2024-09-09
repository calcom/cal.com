import type { TrpcSessionUser } from "../../../trpc";
import type { TAddMembersToTeams } from "./addMembersToTeams.schema";
type AddBulkTeamsHandler = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAddMembersToTeams;
};
export declare function addTeamsHandler({ ctx, input }: AddBulkTeamsHandler): Promise<{
    success: boolean;
    invitedTotalUsers: number;
}>;
export default addTeamsHandler;
