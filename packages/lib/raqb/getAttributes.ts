// TODO: Queries in this file are not optimized. Need to optimize them.
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

import type { Attribute } from "./types";

const whereClauseForAttributesAssignedToMembersOfTeam = (teamId: number) => ({
  member: {
    user: {
      teams: {
        some: {
          teamId,
        },
      },
    },
  },
});
/**
 * It return and attributeOption multiple times depending on how many users it is assigned to
 */
async function getAssignedAttributeOptions({ teamId }: { teamId: number }) {
  const log = logger.getSubLogger({ prefix: ["getAttributeToUserWithMembershipAndAttributes"] });

  log.debug(
    safeStringify({
      teamId,
      whereClauseForAttributesAssignedToMembersOfTeam,
    })
  );

  const assignedAttributeOptions = await prisma.attributeToUser.findMany({
    where: whereClauseForAttributesAssignedToMembersOfTeam(teamId),
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
          containedIn: true,
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

async function findAllAttributeOptions({ teamId }: { teamId: number }) {
  return await prisma.attributeOption.findMany({
    where: {
      attribute: {
        team: {
          children: {
            some: {
              id: teamId,
            },
          },
        },
      },
    },
    select: {
      id: true,
      value: true,
      slug: true,
      contains: true,
      containedIn: true,
      isGroup: true,
      attribute: true,
    },
  });
}

async function getAttributesAssignedToMembersOfTeam({ teamId }: { teamId: number }) {
  const log = logger.getSubLogger({ prefix: ["getAttributeToUserWithMembershipAndAttributes"] });

  const whereClauseForAttributesAssignedToMembersOfTeam = {
    options: {
      some: {
        assignedUsers: {
          some: {
            member: {
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

type AttributeId = string;
export type AttributeOptionValueWithType = {
  type: Attribute["type"];
  attributeOption: {
    value: string | string[];
    contains: {
      id: string;
      value: string;
    }[];
    containedIn: {
      id: string;
      value: string;
    }[];
  };
};

type UserId = number;

/**
 * Ensures all attributes are their with all their options(only assigned options) mapped to them
 * This is needed because we receive options in an unordered manner
 */
async function getAllAttributesWithTheirOptions({ teamId }: { teamId: number }) {
  const allOptionsOfAllAttributes = await findAllAttributeOptions({ teamId });
  const attributeOptionsMap = new Map<
    AttributeId,
    {
      id: string;
      value: string;
      slug: string;
      containedIn: string[];
      contains: string[];
      isGroup: boolean;
    }[]
  >();
  allOptionsOfAllAttributes.forEach((_attributeOption) => {
    const { attribute, ...attributeOption } = _attributeOption;
    console.log({ attributeOptionSlug: attributeOption.slug });
    const existingOptionsArray = attributeOptionsMap.get(attribute.id);
    const enrichedAttributeOption = {
      ...attributeOption,
      isGroup: attributeOption.contains.length > 0,
      isInAGroup: attributeOption.containedIn.length > 0,
    };
    if (!existingOptionsArray) {
      console.log(`Setting attribute ${attribute.name} with id ${attribute.id}`);
      attributeOptionsMap.set(attribute.id, [enrichedAttributeOption]);
    } else {
      console.log(`Pushing attribute ${attribute.name} with id ${attribute.id}`);
      // We already have the options for this attribute
      existingOptionsArray.push(enrichedAttributeOption);
    }
  });
  return attributeOptionsMap;
}

export async function getTeamMembersWithAttributeOptionValuePerAttribute({ teamId }: { teamId: number }) {
  const assignedAttributeOptions = await getAssignedAttributeOptions({ teamId });
  const allAttributesWithTheirOptions = await getAllAttributesWithTheirOptions({
    teamId,
  });

  console.log({
    allAttributesWithTheirOptions: JSON.stringify(
      Object.fromEntries(allAttributesWithTheirOptions.entries())
    ),
  });

  const teamMembers = assignedAttributeOptions.reduce((acc, attributeToUser) => {
    const { userId } = attributeToUser.member;
    const { attribute, ...attributeOption } = attributeToUser.attributeOption;

    if (!acc[userId]) {
      acc[userId] = { userId, attributes: {} };
    }

    const attributes = acc[userId].attributes;
    const attributeValue = attributes[attribute.id]?.attributeOption.value;
    if (attributeValue instanceof Array) {
      // Value already exists, so push to it
      attributeValue.push(attributeOption.value);
    } else if (attributeValue) {
      // Value already exists, so push to it and also make it an array before pushing
      attributes[attribute.id].attributeOption.value = [attributeValue, attributeOption.value];
    } else {
      // Set the first value
      attributes[attribute.id] = {
        type: attribute.type,
        attributeOption: {
          value: attributeOption.value,
          contains: attributeOption.contains
            .map((optionId) => {
              const allOptions = allAttributesWithTheirOptions.get(attribute.id);
              const option = allOptions?.find((option) => option.id === optionId);
              if (!option) {
                console.error(
                  `Generating contains for attribute ${
                    attribute.name
                  }: Option with id ${optionId} not found. Looked up in ${JSON.stringify(allOptions)}`
                );
                return null;
              }
              return option;
            })
            .filter((option): option is NonNullable<typeof option> => option !== null),
          containedIn: attributeOption.containedIn
            .map((optionId) => {
              const option = allAttributesWithTheirOptions
                .get(attribute.id)
                ?.find((option) => option.id === optionId);
              if (!option) {
                console.error(`Generating containedIn: Option with id ${optionId} not found`);
                return null;
              }
              return option;
            })
            .filter((option): option is NonNullable<typeof option> => option !== null),
        },
      };
    }
    return acc;
  }, {} as Record<UserId, { userId: UserId; attributes: Record<AttributeId, AttributeOptionValueWithType> }>);

  return Object.values(teamMembers);
}
