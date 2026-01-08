import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";

type ListUserClientsOptions = {
  ctx: {
    user: {
      id: number;
    };
  };
};

export const listUserClientsHandler = async ({ ctx }: ListUserClientsOptions) => {
  const userId = ctx.user.id;

  const oAuthClientRepository = await OAuthClientRepository.withGlobalPrisma();

  return oAuthClientRepository.findByUserId(userId);
};
