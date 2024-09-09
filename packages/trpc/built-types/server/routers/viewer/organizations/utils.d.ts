import type { TrpcSessionUser } from "../../../trpc";
import type { TAddMembersToTeams } from "./addMembersToTeams.schema";
interface AddBulkToTeamProps {
    user: NonNullable<TrpcSessionUser>;
    input: TAddMembersToTeams;
}
export declare const addMembersToTeams: ({ user, input }: AddBulkToTeamProps) => Promise<{
    success: boolean;
    invitedTotalUsers: number;
}>;
export {};
