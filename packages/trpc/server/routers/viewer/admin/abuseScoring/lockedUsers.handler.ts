import { getAbuseScoringRepository } from "@calcom/features/abuse-scoring/di/AbuseScoringRepository.container";

import type { TListLockedUsersInputSchema, TUnlockUserInputSchema } from "./lockedUsers.schema";

type ListLockedUsersOptions = {
  input: TListLockedUsersInputSchema;
};

export const listLockedUsersHandler = async ({ input }: ListLockedUsersOptions) => {
  const repository = getAbuseScoringRepository();
  return repository.findLockedUsersPaginated(input.limit, input.offset, input.searchTerm);
};

type UnlockUserOptions = {
  input: TUnlockUserInputSchema;
};

export const unlockUserHandler = async ({ input }: UnlockUserOptions) => {
  const repository = getAbuseScoringRepository();
  await repository.unlockUser(input.userId);
  return { userId: input.userId };
};
