import { prisma } from "@calcom/prisma";

import { OrganizationRepository } from "./OrganizationRepository";

export const organizationRepository = new OrganizationRepository({ prismaClient: prisma });

export { OrganizationRepository };
