import type { TrpcSessionUser } from "../../../types";
import type { TAddMembersToTeams } from "./addMembersToTeams.schema";
import { addMembersToTeams } from "./utils";

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
