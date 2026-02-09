// TODO: Queries in this file are not optimized. Need to optimize them.
import type { Attribute } from "@calcom/app-store/routing-forms/types/types";
import type {
  AttributeId,
  AttributeOptionValueWithType,
} from "@calcom/app-store/routing-forms/types/types";
import { PrismaAttributeRepository } from "@calcom/features/attributes/repositories/PrismaAttributeRepository";
import { PrismaAttributeToUserRepository } from "@calcom/features/attributes/repositories/PrismaAttributeToUserRepository";
import logger from "@calcom/lib/logger";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { AttributeToUser } from "@calcom/prisma/client";
import type { AttributeType } from "@calcom/prisma/enums";

/**
 * Extracts attribute IDs referenced in a routing rule's attributesQueryValue.
 * This allows us to only fetch the attributes that are actually needed for evaluation.
 */
export function extractAttributeIdsFromQueryValue(
  queryValue: AttributesQueryValue | null,
  fallbackQueryValue?: AttributesQueryValue | null
): string[] {
  const attributeIds = new Set<string>();

  function walkRules(obj: unknown) {
    if (!obj || typeof obj !== "object") return;

    const record = obj as Record<string, unknown>;

    // Check if this is a rule with a field property (the attribute ID)
    if (record.type === "rule" && record.properties) {
      const properties = record.properties as Record<string, unknown>;
      if (typeof properties.field === "string") {
        attributeIds.add(properties.field);
      }
    }

    // Recursively walk children1 (the RAQB structure for nested rules)
    if (record.children1 && typeof record.children1 === "object") {
      for (const child of Object.values(record.children1 as Record<string, unknown>)) {
        walkRules(child);
      }
    }
  }

  if (queryValue) {
    walkRules(queryValue);
  }

  if (fallbackQueryValue) {
    walkRules(fallbackQueryValue);
  }

  return Array.from(attributeIds);
}

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

async function _findMembershipsForBothOrgAndTeam({
  orgId,
  teamId,
}: {
  orgId: number;
  teamId: number;
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      teamId: {
        in: [orgId, teamId],
      },
    },
  });

  type Membership = (typeof memberships)[number];

  const { teamMemberships, orgMemberships } = memberships.reduce<{
    teamMemberships: Membership[];
    orgMemberships: Membership[];
  }>(
    (acc, membership) => {
      if (membership.teamId === teamId) {
        acc.teamMemberships.push(membership);
      } else if (membership.teamId === orgId) {
        acc.orgMemberships.push(membership);
      }
      return acc;
    },
    { teamMemberships: [], orgMemberships: [] }
  );

  return {
    teamMemberships,
    orgMemberships,
  };
}

function _prepareAssignmentData({
  assignmentsForTheTeam,
  lookupMaps,
  allTeamMemberIds,
}: {
  assignmentsForTheTeam: AssignmentForTheTeam[];
  lookupMaps: AttributeLookupMaps;
  /** All team member user IDs - ensures members without assignments are included */
  allTeamMemberIds: UserId[];
}) {
  const { optionIdToOption, attributeIdToOptions } = lookupMaps;

  // Group assignments by userId for O(1) lookup
  const assignmentsByUserId = new Map<UserId, AssignmentForTheTeam[]>();
  for (const assignment of assignmentsForTheTeam) {
    const existing = assignmentsByUserId.get(assignment.userId);
    if (existing) {
      existing.push(assignment);
    } else {
      assignmentsByUserId.set(assignment.userId, [assignment]);
    }
  }

  // Iterate over all team members once, applying their assignments if any.
  // This ensures members without assignments are still included (important for
  // "not any in" filters where members without the attribute should match).
  const result: {
    userId: UserId;
    attributes: Record<AttributeId, AttributeOptionValueWithType>;
  }[] = [];

  for (const userId of allTeamMemberIds) {
    const memberData: {
      userId: UserId;
      attributes: Record<AttributeId, AttributeOptionValueWithType>;
    } = { userId, attributes: {} };

    const userAssignments = assignmentsByUserId.get(userId);
    if (userAssignments) {
      for (const attributeToUser of userAssignments) {
        const attributeOption = attributeToUser.attributeOption;
        const attribute = attributeToUser.attribute;
        const attributes = memberData.attributes;

        const currentAttributeOptionValue = attributes[attribute.id]?.attributeOption;
        const newAttributeOptionValue = {
          isGroup: attributeOption.isGroup,
          value: attributeOption.value,
          contains: tranformContains({
            contains: attributeOption.contains,
            attribute,
          }),
        };

        if (currentAttributeOptionValue instanceof Array) {
          attributes[attribute.id].attributeOption = [
            ...currentAttributeOptionValue,
            newAttributeOptionValue,
          ];
        } else if (currentAttributeOptionValue) {
          attributes[attribute.id].attributeOption = [
            currentAttributeOptionValue,
            newAttributeOptionValue,
          ];
        } else {
          // Set the first value
          attributes[attribute.id] = {
            type: attribute.type,
            attributeOption: newAttributeOptionValue,
          };
        }
      }
    }

    result.push(memberData);
  }

  return result;

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
        const option = optionIdToOption.get(optionId);
        if (!option) {
          const allOptions = attributeIdToOptions.get(attribute.id);
          console.error(
            `Enriching "contains" for attribute ${
              attribute.name
            }: Option with id ${optionId} not found. Looked up in ${JSON.stringify(
              allOptions
            )}`
          );
          return null;
        }
        return {
          id: option.id,
          value: option.value,
          slug: option.slug,
        };
      })
      .filter(
        (option): option is NonNullable<typeof option> => option !== null
      );
  }
}

/**
 * Builds lookup maps for O(1) attribute and option lookups by option ID.
 * This replaces O(n×m) linear scans with O(1) Map lookups.
 */
function _buildAttributeLookupMaps(attributesOfTheOrg: FullAttribute[]) {
  const optionIdToAttribute = new Map<AttributeOptionId, FullAttribute>();
  const optionIdToOption = new Map<
    AttributeOptionId,
    FullAttribute["options"][number]
  >();
  const attributeIdToOptions = new Map<string, FullAttribute["options"]>();

  for (const attribute of attributesOfTheOrg) {
    attributeIdToOptions.set(attribute.id, attribute.options);
    for (const option of attribute.options) {
      optionIdToAttribute.set(option.id, attribute);
      optionIdToOption.set(option.id, option);
    }
  }

  return { optionIdToAttribute, optionIdToOption, attributeIdToOptions };
}

type AttributeLookupMaps = ReturnType<typeof _buildAttributeLookupMaps>;

function _getAttributeFromAttributeOption({
  lookupMaps,
  attributeOptionId,
}: {
  lookupMaps: AttributeLookupMaps;
  attributeOptionId: AttributeOptionId;
}) {
  return lookupMaps.optionIdToAttribute.get(attributeOptionId);
}

function _getAttributeOptionFromId({
  lookupMaps,
  attributeOptionId,
}: {
  lookupMaps: AttributeLookupMaps;
  attributeOptionId: AttributeOptionId;
}) {
  return lookupMaps.optionIdToOption.get(attributeOptionId);
}

async function _getOrgMembershipToUserIdForTeam({
  orgId,
  teamId,
}: {
  orgId: number;
  teamId: number;
}) {
  const { orgMemberships, teamMemberships } =
    await _findMembershipsForBothOrgAndTeam({
      orgId,
      teamId,
    });

  // Using map for performance lookup as it matters in the below loop working with 1000s of records
  const orgMembershipsByUserId = new Map(
    orgMemberships.map((m) => [m.userId, m])
  );

  /**
   * Holds the records of orgMembershipId to userId for the sub-team's members only.
   */
  const orgMembershipToUserIdForTeamMembers = new Map<
    OrgMembershipId,
    UserId
  >();

  /**
   * For an organization with 3000 users and 10 teams, with every team having around 300 members, the total memberships we get for a team are 3000+300 = 3300
   * So, these are not a lot of records and we could afford to do in memory computations on them.
   */
  teamMemberships.forEach((teamMembership) => {
    const orgMembership = orgMembershipsByUserId.get(teamMembership.userId);
    if (!orgMembership) {
      // console.error(
      //   `Org membership not found for userId ${teamMembership.userId} in the organization's memberships`
      // );
      return;
    }
    orgMembershipToUserIdForTeamMembers.set(
      orgMembership.id,
      orgMembership.userId
    );
  });

  return orgMembershipToUserIdForTeamMembers;
}

async function _queryAllData({
  orgId,
  teamId,
  attributeIds,
}: {
  orgId: number;
  teamId: number;
  /** If provided, only fetch attribute assignments for these attribute IDs */
  attributeIds?: string[];
}) {
  const attributeRepo = new PrismaAttributeRepository(prisma);
  const attributeToUserRepo = new PrismaAttributeToUserRepository(prisma);

  const [orgMembershipToUserIdForTeamMembers, attributesOfTheOrg] =
    await Promise.all([
      _getOrgMembershipToUserIdForTeam({ orgId, teamId }),
      attributeRepo.findManyByOrgId({ orgId, attributeIds }),
    ]);

  const orgMembershipIds = Array.from(
    orgMembershipToUserIdForTeamMembers.keys()
  );

  // Get the attributes assigned to the members of the team
  // If attributeIds is provided, only fetch assignments for those specific attributes
  const attributesToUsersForTeam =
    await attributeToUserRepo.findManyByOrgMembershipIds({
      orgMembershipIds,
      attributeIds,
    });

  return {
    attributesOfTheOrg,
    attributesToUsersForTeam,
    orgMembershipToUserIdForTeamMembers,
  };
}

async function getAttributesAssignedToMembersOfTeam({
  teamId,
  userId,
}: {
  teamId: number;
  userId?: number;
}) {
  const log = logger.getSubLogger({
    prefix: ["getAttributeToUserWithMembershipAndAttributes"],
  });

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
  lookupMaps,
}: {
  attributesToUsersForTeam: AttributeToUser[];
  orgMembershipToUserIdForTeamMembers: Map<OrgMembershipId, UserId>;
  lookupMaps: AttributeLookupMaps;
}) {
  return attributesToUsersForTeam
    .map((attributeToUser) => {
      const orgMembershipId = attributeToUser.memberId;
      const userId = orgMembershipToUserIdForTeamMembers.get(orgMembershipId);
      if (!userId) {
        console.error(
          `No org membership found for membership id ${orgMembershipId}`
        );
        return null;
      }
      const attribute = _getAttributeFromAttributeOption({
        lookupMaps,
        attributeOptionId: attributeToUser.attributeOptionId,
      });

      const attributeOption = _getAttributeOptionFromId({
        lookupMaps,
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
    .filter(
      (assignment): assignment is NonNullable<typeof assignment> =>
        assignment !== null
    );
}

export async function getAttributesAssignmentData({
  orgId,
  teamId,
  attributeIds,
}: {
  orgId: number;
  teamId: number;
  /** If provided, only fetch attribute assignments for these attribute IDs.
   * This significantly improves performance when only a few attributes are needed. */
  attributeIds?: string[];
}) {
  const {
    attributesOfTheOrg,
    attributesToUsersForTeam,
    orgMembershipToUserIdForTeamMembers,
  } = await _queryAllData({
    orgId,
    teamId,
    attributeIds,
  });

  const lookupMaps = _buildAttributeLookupMaps(attributesOfTheOrg);

  const assignmentsForTheTeam = _buildAssignmentsForTeam({
    attributesToUsersForTeam,
    orgMembershipToUserIdForTeamMembers,
    lookupMaps,
  });

  const allTeamMemberIds = Array.from(orgMembershipToUserIdForTeamMembers.values());

  logger.debug("getAttributesAssignmentData", {
    teamId,
    orgId,
    attributeIds,
    allTeamMemberIdsCount: allTeamMemberIds.length,
    assignmentsForTheTeamCount: assignmentsForTheTeam.length,
  });

  const attributesAssignedToTeamMembersWithOptions = _prepareAssignmentData({
    assignmentsForTheTeam,
    lookupMaps,
    allTeamMemberIds,
  });

  logger.debug("getAttributesAssignmentData result", {
    attributesAssignedToTeamMembersWithOptionsCount: attributesAssignedToTeamMembersWithOptions.length,
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

export async function getUsersAttributes({
  userId,
  teamId,
}: {
  userId: number;
  teamId: number;
}) {
  return await getAttributesAssignedToMembersOfTeam({ teamId, userId });
}
