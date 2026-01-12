import { PrismaAttributeOptionRepository } from "@calcom/features/attributes/repositories/PrismaAttributeOptionRepository";
import {
  buildSlugFromValue,
  canSetValueBeyondOptions,
  hasOptions,
} from "@calcom/features/ee/dsync/lib/assignValueToUserUtils";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { PrismaAttributeRepository } from "@calcom/features/attributes/repositories/PrismaAttributeRepository";
import { PrismaAttributeToUserRepository } from "@calcom/features/attributes/repositories/PrismaAttributeToUserRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { IFieldMapping } from "../repositories/IIntegrationAttributeSyncRepository";
import { attributeRepositoryModule } from "di/modules/Attribute";

const log = logger.getSubLogger({
  prefix: ["[AttributeSyncFieldMappingService]"],
});

interface IAttributeSyncFieldMappingServiceDeps {
  attributeToUserRepository: PrismaAttributeToUserRepository;
  attributeRepository: PrismaAttributeRepository;
  attributeOptionRepository: PrismaAttributeOptionRepository;
}

export class AttributeSyncFieldMappingService {
  constructor(private readonly deps: IAttributeSyncFieldMappingServiceDeps) {}

  async syncIntegrationFieldsToAttributes({
    userId,
    organizationId,
    syncFieldMappings,
    integrationFields,
  }: {
    userId: number;
    organizationId: number;
    syncFieldMappings: IFieldMapping[];
    integrationFields: Record<string, string>;
  }): Promise<void> {
    const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({
      userId,
      teamId: organizationId,
    });

    if (!membership) {
      log.warn(
        `No membership found for user ${userId} in org ${organizationId}`
      );
      return;
    }

    const memberId = membership.id;

    const enabledSyncFieldMappings = syncFieldMappings.filter(
      (mapping) =>
        mapping.enabled &&
        integrationFields[mapping.integrationFieldName] !== undefined
    );

    if (enabledSyncFieldMappings.length === 0) {
      log.warn("No enabled mappings with matching integration fields");
      return;
    }

    const attributeIds = enabledSyncFieldMappings.map((m) => m.attributeId);

    const attributes =
      await this.deps.attributeRepository.findManyByIdsAndOrgIdWithOptions({
        attributeIds,
        orgId: organizationId,
      });

    const attributeMap = new Map(attributes.map((a) => [a.id, a]));

    const { attributeIdsToSync, optionsToCreate, assignmentsToCreate } =
      this.processMappings({
        enabledMappings: enabledSyncFieldMappings,
        attributeMap,
        integrationFields,
        memberId,
        orgId: organizationId,
      });

    if (optionsToCreate.length > 0) {
      const newAssignments = await this.createOptionsAndGetAssignments({
        optionsToCreate,
        memberId,
        orgId: organizationId,
      });
      assignmentsToCreate.push(...newAssignments);
    }

    if (assignmentsToCreate.length > 0) {
      await prisma.attributeToUser.createMany({
        data: assignmentsToCreate,
        skipDuplicates: true,
      });

      log.info(
        `Synced ${assignmentsToCreate.length} attribute(s) for member ${memberId}`
      );
    }

    if (attributeIdsToSync.length > 0) {
      await prisma.attributeToUser.deleteMany({
        where: {
          memberId,
          attributeOption: {
            attributeId: { in: attributeIdsToSync },
          },
        },
      });
    }
  }

  private processMappings({
    enabledMappings,
    attributeMap,
    integrationFields,
    memberId,
    orgId,
  }: {
    enabledMappings: IFieldMapping[];
    attributeMap: Map<
      string,
      {
        id: string;
        name: string;
        type: string;
        options: { id: string; value: string; slug: string }[];
      }
    >;
    integrationFields: Record<string, unknown>;
    memberId: number;
    orgId: number;
  }): {
    attributeIdsToSync: string[];
    optionsToCreate: Array<{
      attributeId: string;
      value: string;
      slug: string;
    }>;
    assignmentsToCreate: Array<{ memberId: number; attributeOptionId: string }>;
  } {
    const attributeIdsToSync: string[] = [];
    const optionsToCreate: Array<{
      attributeId: string;
      value: string;
      slug: string;
    }> = [];
    const assignmentsToCreate: Array<{
      memberId: number;
      attributeOptionId: string;
    }> = [];

    for (const mapping of enabledMappings) {
      const attribute = attributeMap.get(mapping.attributeId);
      if (!attribute) {
        log.warn(`Attribute ${mapping.attributeId} not found for org ${orgId}`);
        continue;
      }

      const fieldValue = String(
        integrationFields[mapping.integrationFieldName]
      );

      if (hasOptions({ attribute })) {
        // SINGLE_SELECT / MULTI_SELECT - must find existing option
        const matchingOption = attribute.options.find(
          (opt) => opt.value.toLowerCase() === fieldValue.toLowerCase()
        );

        if (!matchingOption) {
          log.warn(
            `No matching option for value "${fieldValue}" in attribute ${attribute.id} (${attribute.name})`
          );
          continue;
        }

        attributeIdsToSync.push(attribute.id);
        assignmentsToCreate.push({
          memberId,
          attributeOptionId: matchingOption.id,
        });
      } else if (canSetValueBeyondOptions({ attribute })) {
        // TEXT / NUMBER - find existing option or create new one
        const existingOption = attribute.options.find(
          (opt) => opt.value.toLowerCase() === fieldValue.toLowerCase()
        );

        attributeIdsToSync.push(attribute.id);

        if (existingOption) {
          assignmentsToCreate.push({
            memberId,
            attributeOptionId: existingOption.id,
          });
        } else {
          // Need to create a new option
          optionsToCreate.push({
            attributeId: attribute.id,
            value: fieldValue,
            slug: buildSlugFromValue({ value: fieldValue }),
          });
        }
      }
    }

    return { attributeIdsToSync, optionsToCreate, assignmentsToCreate };
  }

  private async createOptionsAndGetAssignments({
    optionsToCreate,
    memberId,
    orgId,
  }: {
    optionsToCreate: Array<{
      attributeId: string;
      value: string;
      slug: string;
    }>;
    memberId: number;
    orgId: number;
  }): Promise<Array<{ memberId: number; attributeOptionId: string }>> {
    await this.deps.attributeOptionRepository.createMany({
      createManyInput: optionsToCreate,
    });

    const allOptions = await this.deps.attributeOptionRepository.findMany({
      orgId,
    });

    const assignments: Array<{ memberId: number; attributeOptionId: string }> =
      [];

    for (const newOption of optionsToCreate) {
      const createdOption = allOptions.find(
        (o) =>
          o.attributeId === newOption.attributeId &&
          o.value.toLowerCase() === newOption.value.toLowerCase()
      );

      if (createdOption) {
        assignments.push({
          memberId,
          attributeOptionId: createdOption.id,
        });
      } else {
        log.error(
          `Failed to find newly created option for attribute ${newOption.attributeId}`
        );
      }
    }

    return assignments;
  }
}
