import { prisma } from "@calcom/prisma";
import { ServiceName } from "@calcom/prisma/enums";

import type { TGetAllServicesInputSchema } from "./getAllServices.schema";

type GetAllServicesOptions = {
  input?: TGetAllServicesInputSchema;
};

export const getAllServicesHandler = async ({}: GetAllServicesOptions) => {
  // Get all existing service configurations from database
  const services = await prisma.thirdPartyService.findMany({
    select: {
      id: true,
      name: true,
      defaultProvider: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // Get all possible service names from enum
  const allServiceNames = Object.values(ServiceName);

  // Create a map of existing services for quick lookup
  const serviceMap = new Map(services.map((service) => [service.name, service]));

  // Return all services with their configuration status
  const allServices = allServiceNames.map((serviceName) => {
    const existingService = serviceMap.get(serviceName);

    if (existingService) {
      return {
        ...existingService,
        isConfigured: true,
      };
    }

    // Return unconfigured service placeholder
    return {
      id: null,
      name: serviceName,
      defaultProvider: null,
      description: null,
      createdAt: null,
      updatedAt: null,
      isConfigured: false,
    };
  });

  return {
    services: allServices,
    totalServices: allServices.length,
    configuredServices: services.length,
    unconfiguredServices: allServices.length - services.length,
  };
};
