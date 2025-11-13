import { prisma } from "@calcom/prisma";

import type { TGetServiceProviderInputSchema } from "./getServiceProvider.schema";

type GetServiceProviderOptions = {
  input: TGetServiceProviderInputSchema;
};

export const getServiceProviderHandler = async ({ input }: GetServiceProviderOptions) => {
  const { serviceName } = input;

  const service = await prisma.thirdPartyService.findUnique({
    where: {
      name: serviceName,
    },
    select: {
      id: true,
      name: true,
      defaultProvider: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return service;
};
