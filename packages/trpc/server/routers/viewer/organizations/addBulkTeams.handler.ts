import type { TrpcSessionUser } from "../../../trpc";
import type { TAddBulkTeams } from "./addBulkTeams.schema";
import { addBulkToTeam } from "./utils";

type AddBulkTeamsHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddBulkTeams;
};

export async function addBulkTeamsHandler({ ctx, input }: AddBulkTeamsHandler) {
  return addBulkToTeam({
    user: ctx.user,
    input,
  });
}

export default addBulkTeamsHandler;
