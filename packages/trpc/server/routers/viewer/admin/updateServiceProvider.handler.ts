import { prisma } from "@calcom/prisma";

import type { TUpdateServiceProviderInputSchema } from "./updateServiceProvider.schema";

type UpdateServiceProviderOptions = {
  input: TUpdateServiceProviderInputSchema;
};

export const updateServiceProviderHandler = async ({ input }: UpdateServiceProviderOptions) => {
  const { serviceName, defaultProvider, description } = input;

  // Check if service configuration exists
  const existingService = await prisma.thirdPartyService.findUnique({
    where: {
      name: serviceName,
    },
  });

  if (!existingService) {
    // Create new service configuration if it doesn't exist
    const newService = await prisma.thirdPartyService.create({
      data: {
        name: serviceName,
        defaultProvider,
        description,
      },
      select: {
        id: true,
        name: true,
        defaultProvider: true,
        description: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: `Default provider for ${serviceName} has been set to ${defaultProvider}`,
      service: newService,
    };
  }

  // Update existing service configuration
  const updatedService = await prisma.thirdPartyService.update({
    where: {
      name: serviceName,
    },
    data: {
      defaultProvider,
      ...(description !== undefined && { description }),
    },
    select: {
      id: true,
      name: true,
      defaultProvider: true,
      description: true,
      updatedAt: true,
    },
  });

  return {
    success: true,
    message: `Default provider for ${serviceName} has been updated to ${defaultProvider}`,
    service: updatedService,
  };
};
