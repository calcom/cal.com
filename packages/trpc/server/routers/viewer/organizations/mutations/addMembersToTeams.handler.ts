import type { TrpcSessionUser } from "../../../../../types";
import { addMembersToTeams } from "../utils";
import type { TAddMembersToTeams } from "./addMembersToTeams.schema";

type AddBulkTeamsHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddMembersToTeams;
};

export async function addTeamsHandler({ ctx, input }: AddBulkTeamsHandler) {
  return addMembersToTeams({
    user: ctx.user,
    input,
  });
}

export default addTeamsHandler;
