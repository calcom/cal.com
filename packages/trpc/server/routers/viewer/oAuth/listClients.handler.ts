import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";

import type { TListClientsInputSchema } from "./listClients.schema";

type ListClientsOptions = {
  input: TListClientsInputSchema;
};

export const listClientsHandler = async ({ input }: ListClientsOptions) => {
  const { status } = input;

  const oAuthClientRepository = await OAuthClientRepository.withGlobalPrisma();

  if (status) {
    return oAuthClientRepository.findByStatus(status);
  }

  return oAuthClientRepository.findAll();
};
