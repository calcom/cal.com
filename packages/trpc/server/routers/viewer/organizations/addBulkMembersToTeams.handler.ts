import type { TrpcSessionUser } from "../../../trpc";
import type { TAddBulkMembersToTeams } from "./addBulkMembersToTeams.schema";
import { addBulkMembersToTeams } from "./utils";

type AddBulkTeamsHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddBulkMembersToTeams;
};

export async function addBulkTeamsHandler({ ctx, input }: AddBulkTeamsHandler) {
  return addBulkMembersToTeams({
    user: ctx.user,
    input,
  });
}

export default addBulkTeamsHandler;
