import { OAuthClientRepository } from "@calcom/lib/server/repository/oAuthClient";

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
