// TODO: Queries in this file are not optimized. Need to optimize them.
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { AttributeToUser } from "@calcom/prisma/client";
import type { AttributeType } from "@calcom/prisma/enums";

import { PrismaAttributeRepository } from "../../../server/repository/PrismaAttributeRepository";
import { PrismaAttributeToUserRepository } from "../../../server/repository/PrismaAttributeToUserRepository";
import type { AttributeId } from "../types";

type UserId = number;
type OrgMembershipId = number;
type AttributeOptionId = string;
type AssignmentForTheTeam = {
  userId: number;
  attributeOption: {
    id: string;
    value: string;
    slug: string;
    contains: string[];
    isGroup: boolean;
  };
  attribute: {
    id: string;
    name: string;
    type: AttributeType;
  };
};

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

type FullAttribute = {
  name: string;
  slug: string;
  type: AttributeType;
  id: string;
  options: {
    id: string;
    value: string;
    slug: string;
    isGroup: boolean;
    contains: string[];
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

async function _findMembershipsForBothOrgAndTeam({ orgId, teamId }: { orgId: number; teamId: number }) {
  const memberships = await prisma.membership.findMany({
    where: {
      teamId: {
        in: [orgId, teamId],
      },
    },
  });

  type Membership = (typeof memberships)[number];

  const { teamMemberships, orgMemberships } = memberships.reduce(
    (acc, membership) => {
      if (membership.teamId === teamId) {
        acc.teamMemberships.push(membership);
      } else if (membership.teamId === orgId) {
        acc.orgMemberships.push(membership);
      }
      return acc;
    },
    { teamMemberships: [] as Membership[], orgMemberships: [] as Membership[] }
  );

  return {
    teamMemberships,
    orgMemberships,
  };
}

function _prepareAssignmentData({
  assignmentsForTheTeam,
  attributesOfTheOrg,
}: {
  assignmentsForTheTeam: AssignmentForTheTeam[];
  attributesOfTheOrg: Attribute[];
}) {
  const teamMembersThatHaveOptionAssigned = assignmentsForTheTeam.reduce((acc, attributeToUser) => {
    const userId = attributeToUser.userId;
    const attributeOption = attributeToUser.attributeOption;
    const attribute = attributeToUser.attribute;

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
        const allOptions = attributesOfTheOrg.find((_attribute) => _attribute.id === attribute.id)?.options;
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

function _getAttributeFromAttributeOption({
  allAttributesOfTheOrg,
  attributeOptionId,
}: {
  allAttributesOfTheOrg: Attribute[];
  attributeOptionId: AttributeOptionId;
}) {
  return allAttributesOfTheOrg.find((attribute) =>
    attribute.options.some((option) => option.id === attributeOptionId)
  );
}

function _getAttributeOptionFromAttributeOption({
  allAttributesOfTheOrg,
  attributeOptionId,
}: {
  allAttributesOfTheOrg: FullAttribute[];
  attributeOptionId: AttributeOptionId;
}) {
  const matchingOption = allAttributesOfTheOrg.reduce((found, attribute) => {
    if (found) return found;
    return attribute.options.find((option) => option.id === attributeOptionId) || null;
  }, null as null | (typeof allAttributesOfTheOrg)[number]["options"][number]);
  return matchingOption;
}

async function _getOrgMembershipToUserIdForTeam({ orgId, teamId }: { orgId: number; teamId: number }) {
  const { orgMemberships, teamMemberships } = await _findMembershipsForBothOrgAndTeam({
    orgId,
    teamId,
  });

  // Using map for performance lookup as it matters in the below loop working with 1000s of records
  const orgMembershipsByUserId = new Map(orgMemberships.map((m) => [m.userId, m]));

  /**
   * Holds the records of orgMembershipId to userId for the sub-team's members only.
   */
  const orgMembershipToUserIdForTeamMembers = new Map<OrgMembershipId, UserId>();

  /**
   * For an organization with 3000 users and 10 teams, with every team having around 300 members, the total memberships we get for a team are 3000+300 = 3300
   * So, these are not a lot of records and we could afford to do in memory computations on them.
   */
  teamMemberships.forEach((teamMembership) => {
    const orgMembership = orgMembershipsByUserId.get(teamMembership.userId);
    if (!orgMembership) {
      console.error(
        `Org membership not found for userId ${teamMembership.userId} in the organization's memberships`
      );
      return;
    }
    orgMembershipToUserIdForTeamMembers.set(orgMembership.id, orgMembership.userId);
  });

  return orgMembershipToUserIdForTeamMembers;
}

async function _queryAllData({ orgId, teamId }: { orgId: number; teamId: number }) {
  const attributeRepo = new PrismaAttributeRepository(prisma);

  const [orgMembershipToUserIdForTeamMembers, attributesOfTheOrg] = await Promise.all([
    _getOrgMembershipToUserIdForTeam({ orgId, teamId }),
    attributeRepo.findManyByOrgId({ orgId }),
  ]);

  const orgMembershipIds = Array.from(orgMembershipToUserIdForTeamMembers.keys());

  // Get all the attributes assigned to the members of the team
  const attributesToUsersForTeam = await PrismaAttributeToUserRepository.findManyByOrgMembershipIds({
    orgMembershipIds,
  });

  return {
    attributesOfTheOrg,
    attributesToUsersForTeam,
    orgMembershipToUserIdForTeamMembers,
  };
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
      isWeightsEnabled: true,
      options: {
        select: {
          id: true,
          value: true,
          slug: true,
          contains: true,
          isGroup: true,
        },
      },
      slug: true,
    },
  });

  return assignedAttributeOptions;
}

function _buildAssignmentsForTeam({
  attributesToUsersForTeam,
  orgMembershipToUserIdForTeamMembers,
  attributesOfTheOrg,
}: {
  attributesToUsersForTeam: AttributeToUser[];
  orgMembershipToUserIdForTeamMembers: Map<OrgMembershipId, UserId>;
  attributesOfTheOrg: FullAttribute[];
}) {
  return attributesToUsersForTeam
    .map((attributeToUser) => {
      const orgMembershipId = attributeToUser.memberId;
      const userId = orgMembershipToUserIdForTeamMembers.get(orgMembershipId);
      if (!userId) {
        console.error(`No org membership found for membership id ${orgMembershipId}`);
        return null;
      }
      const attribute = _getAttributeFromAttributeOption({
        allAttributesOfTheOrg: attributesOfTheOrg,
        attributeOptionId: attributeToUser.attributeOptionId,
      });

      const attributeOption = _getAttributeOptionFromAttributeOption({
        allAttributesOfTheOrg: attributesOfTheOrg,
        attributeOptionId: attributeToUser.attributeOptionId,
      });

      if (!attributeOption || !attribute) {
        console.error(
          `Attribute option with id ${attributeToUser.attributeOptionId} not found in the organization's attributes`
        );
        return null;
      }

      return {
        ...attributeToUser,
        userId,
        attribute,
        attributeOption,
      };
    })
    .filter((assignment): assignment is NonNullable<typeof assignment> => assignment !== null);
}

export async function getAttributesAssignmentData({ orgId, teamId }: { orgId: number; teamId: number }) {
  const { attributesOfTheOrg, attributesToUsersForTeam, orgMembershipToUserIdForTeamMembers } =
    await _queryAllData({
      orgId,
      teamId,
    });

  const assignmentsForTheTeam = _buildAssignmentsForTeam({
    attributesToUsersForTeam,
    orgMembershipToUserIdForTeamMembers,
    attributesOfTheOrg,
  });

  const attributesAssignedToTeamMembersWithOptions = _prepareAssignmentData({
    attributesOfTheOrg,
    assignmentsForTheTeam,
  });

  return {
    attributesOfTheOrg,
    attributesAssignedToTeamMembersWithOptions,
  };
}

export async function getAttributesForTeam({ teamId }: { teamId: number }) {
  const attributes = await getAttributesAssignedToMembersOfTeam({ teamId });
  return attributes satisfies Attribute[];
}

export async function getUsersAttributes({ userId, teamId }: { userId: number; teamId: number }) {
  return await getAttributesAssignedToMembersOfTeam({ teamId, userId });
}
