import { getMembershipRepository } from "@calcom/features/di/containers/MembershipRepository";
import type { TGetTeamOwnersInput } from "./getTeamOwners.schema";

type GetTeamOwnersOptions = {
  input: TGetTeamOwnersInput;
};

export const getTeamOwnersHandler = async ({ input }: GetTeamOwnersOptions) => {
  const { teamId } = input;
  const membershipRepository = getMembershipRepository();

  const memberships = await membershipRepository.findOwnersByTeamIdIncludeUser({ teamId });

  return {
    owners: memberships.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
    })),
  };
};

export default getTeamOwnersHandler;
