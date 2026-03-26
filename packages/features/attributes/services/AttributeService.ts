import type { PrismaAttributeToUserRepository } from "@calcom/features/attributes/repositories/PrismaAttributeToUserRepository";
import { AttributeType } from "@calcom/prisma/enums";

interface IAttributeServiceDeps {
  attributeToUserRepository: PrismaAttributeToUserRepository;
}

type MultiSelectAttribute = {
  type: "MULTI_SELECT";
  optionIds: Set<string>;
  values: Set<string>;
};

type SingleValueAttribute = {
  type: "TEXT" | "NUMBER" | "SINGLE_SELECT";
  optionId: string | null;
  value: string | null;
};

export type UserAttribute = MultiSelectAttribute | SingleValueAttribute;

export class AttributeService {
  constructor(private readonly deps: IAttributeServiceDeps) {}

  /** Grouped by attribute */
  async getUsersAttributesByOrgMembershipId({
    userId,
    orgId,
  }: {
    userId: number;
    orgId: number;
  }): Promise<Record<string, UserAttribute>> {
    const attributeOptionsAssignedToUser = await this.deps.attributeToUserRepository.findManyIncludeAttribute(
      {
        member: { userId, teamId: orgId },
      }
    );

    const userAttributes: Record<string, UserAttribute> = {};

    for (const assignedAttribute of attributeOptionsAssignedToUser) {
      const attribute = assignedAttribute.attributeOption.attribute;
      const attributeOptionId = assignedAttribute.attributeOptionId;
      const attributeValue = assignedAttribute.attributeOption.value;

      if (attribute.type === AttributeType.MULTI_SELECT) {
        if (attribute.id in userAttributes) {
          const existing = userAttributes[attribute.id] as MultiSelectAttribute;
          existing.optionIds.add(attributeOptionId);
          existing.values.add(attributeValue);
        } else {
          userAttributes[attribute.id] = {
            type: "MULTI_SELECT",
            optionIds: new Set([attributeOptionId]),
            values: new Set([attributeValue]),
          };
        }
      } else {
        // For TEXT, NUMBER, SINGLE_SELECT - only store single value
        userAttributes[attribute.id] = {
          type: attribute.type as "TEXT" | "NUMBER" | "SINGLE_SELECT",
          optionId: attributeOptionId,
          value: attributeValue,
        };
      }
    }
    return userAttributes;
  }
}
