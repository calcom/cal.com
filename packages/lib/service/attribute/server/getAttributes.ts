// TODO: Queries in this file are not optimized. Need to optimize them.
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { AttributeType } from "@calcom/prisma/enums";

import type { AttributeId } from "../types";
import { findAllAttributesWithTheirOptions } from "./utils";

type UserId = number;

export type Attribute = {
  name: string;
  slug: string;
  type: AttributeType;
  id: string;
  options: {
    id: string;
    value: string;
    slug: string;
  }[];
};

export type AttributeOptionValue = {
  value: string;
  isGroup: boolean;
  contains: {
    id: string;
    slug: string;
    value: string;
  }[];
};

export type AttributeOptionValueWithType = {
  type: Attribute["type"];
  attributeOption: AttributeOptionValue | AttributeOptionValue[];
};

/**
 * Note: assignedAttributeOptions[x].attributeOption isn't unique. It is returned multiple times depending on how many users it is assigned to
 */
async function getAssignedAttributeOptions({ teamId }: { teamId: number }) {
  const log = logger.getSubLogger({ prefix: ["getAssignedAttributeOptions"] });
  const whereClauseForAssignment = {
    member: {
      user: {
        teams: {
          some: {
            teamId,
          },
        },
      },
    },
  };

  log.debug(
    safeStringify({
      teamId,
      whereClauseForAssignment,
    })
  );

  const assignedAttributeOptions = await prisma.attributeToUser.findMany({
    where: whereClauseForAssignment,
    select: {
      member: {
        select: {
          userId: true,
        },
      },
      attributeOption: {
        select: {
          id: true,
          value: true,
          slug: true,
          contains: true,
          isGroup: true,
          attribute: {
            select: { id: true, name: true, type: true, slug: true },
          },
        },
      },
    },
  });

  log.debug("Returned assignedAttributeOptions", safeStringify({ assignedAttributeOptions }));
  return assignedAttributeOptions;
}

async function getAttributesAssignedToMembersOfTeam({ teamId, userId }: { teamId: number; userId?: number }) {
  const log = logger.getSubLogger({ prefix: ["getAttributeToUserWithMembershipAndAttributes"] });

  const whereClauseForAttributesAssignedToMembersOfTeam = {
    options: {
      some: {
        assignedUsers: {
          some: {
            member: {
              userId,
              user: {
                teams: {
                  some: {
                    teamId,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  log.debug(
    safeStringify({
      teamId,
      whereClauseForAttributesAssignedToMembersOfTeam,
    })
  );

  const assignedAttributeOptions = await prisma.attribute.findMany({
    where: whereClauseForAttributesAssignedToMembersOfTeam,
    select: {
      id: true,
      name: true,
      type: true,
      options: {
        select: {
          id: true,
          value: true,
          slug: true,
        },
      },
      slug: true,
    },
  });
  return assignedAttributeOptions;
}

export async function getAttributesForTeam({ teamId }: { teamId: number }) {
  const attributes = await getAttributesAssignedToMembersOfTeam({ teamId });
  return attributes satisfies Attribute[];
}

export async function getTeamMembersWithAttributeOptionValuePerAttribute({ teamId }: { teamId: number }) {
  const [assignedAttributeOptions, allAttributesWithTheirOptions] = await Promise.all([
    getAssignedAttributeOptions({ teamId }),
    // We need to fetch even the unassigned options, to know what all sub-options are there in an option group. Because it is possible that sub-options aren't assigned directly to the user
    findAllAttributesWithTheirOptions({ teamId }),
  ]);

  const teamMembersThatHaveOptionAssigned = assignedAttributeOptions.reduce((acc, attributeToUser) => {
    const { userId } = attributeToUser.member;
    const { attribute, ...attributeOption } = attributeToUser.attributeOption;

    if (!acc[userId]) {
      acc[userId] = { userId, attributes: {} };
    }

    const attributes = acc[userId].attributes;
    const currentAttributeOptionValue = attributes[attribute.id]?.attributeOption;
    const newAttributeOptionValue = {
      isGroup: attributeOption.isGroup,
      value: attributeOption.value,
      contains: tranformContains({ contains: attributeOption.contains, attribute }),
    };

    if (currentAttributeOptionValue instanceof Array) {
      attributes[attribute.id].attributeOption = [...currentAttributeOptionValue, newAttributeOptionValue];
    } else if (currentAttributeOptionValue) {
      attributes[attribute.id].attributeOption = [
        currentAttributeOptionValue,
        {
          isGroup: attributeOption.isGroup,
          value: attributeOption.value,
          contains: tranformContains({ contains: attributeOption.contains, attribute }),
        },
      ];
    } else {
      // Set the first value
      attributes[attribute.id] = {
        type: attribute.type,
        attributeOption: newAttributeOptionValue,
      };
    }
    return acc;
  }, {} as Record<UserId, { userId: UserId; attributes: Record<AttributeId, AttributeOptionValueWithType> }>);

  return Object.values(teamMembersThatHaveOptionAssigned);

  /**
   * Transforms ["optionId1", "optionId2"] to [{
   *   id: "optionId1",
   *   value: "optionValue1",
   *   slug: "optionSlug1",
   * }, {
   *   id: "optionId2",
   *   value: "optionValue2",
   *   slug: "optionSlug2",
   * }]
   */
  function tranformContains({
    contains,
    attribute,
  }: {
    contains: string[];
    attribute: { id: string; name: string };
  }) {
    return contains
      .map((optionId) => {
        const allOptions = allAttributesWithTheirOptions.get(attribute.id);
        const option = allOptions?.find((option) => option.id === optionId);
        if (!option) {
          console.error(
            `Enriching "contains" for attribute ${
              attribute.name
            }: Option with id ${optionId} not found. Looked up in ${JSON.stringify(allOptions)}`
          );
          return null;
        }
        return {
          id: option.id,
          value: option.value,
          slug: option.slug,
        };
      })
      .filter((option): option is NonNullable<typeof option> => option !== null);
  }
}

export async function getUsersAttributes({ userId, teamId }: { userId: number; teamId: number }) {
  return await getAttributesAssignedToMembersOfTeam({ teamId, userId });
}
