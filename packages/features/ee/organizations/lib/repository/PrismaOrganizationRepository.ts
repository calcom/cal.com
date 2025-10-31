import type { IOrganizationRepository } from "./IOrganizationRepository";
import type { PrismaClient } from "@calcom/prisma";

export class PrismaOrganizationRepository implements IOrganizationRepository {
    constructor(private readonly prismaClient: PrismaClient) { }

    async getOrganizationAutoAcceptSettings(organizationId: number) {
        const org = await this.prismaClient.team.findUnique({
            where: { id: organizationId, isOrganization: true },
            select: {
                organizationSettings: {
                    select: {
                        orgAutoAcceptEmail: true,
                        isOrganizationVerified: true,
                    },
                },
            },
        });

        return org?.organizationSettings ?? null;
    }
}

