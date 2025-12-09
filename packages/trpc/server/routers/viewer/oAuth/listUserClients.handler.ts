import { OAuthClientRepository } from "@calcom/lib/server/repository/oAuthClient";

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
