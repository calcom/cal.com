import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import { AttributeToUserRepository } from "../../../server/repository/attributeToUser";
import type { AttributeId } from "../types";

const log = logger.getSubLogger({ prefix: ["entity/attribute"] });

async function findTeamById({ teamId }: { teamId: number }) {
  return prisma.team.findUnique({ where: { id: teamId } });
}

/**
 * Returns all the options for all the attributes for a team
 */
const findAllAttributeOptions = async ({ teamId }: { teamId: number }) => {
  const team = await findTeamById({ teamId });

  // A non-org team doesn't have attributes
  if (!team || !team.parentId) {
    return [];
  }

  return await prisma.attributeOption.findMany({
    where: {
      attribute: {
        teamId: team.parentId,
      },
    },
    select: {
      id: true,
      value: true,
      slug: true,
      contains: true,
      isGroup: true,
      attribute: true,
    },
  });
};

/**
 * Ensures all attributes are their with all their options(only assigned options) mapped to them
 */
export const findAllAttributesWithTheirOptions = async ({ teamId }: { teamId: number }) => {
  const allOptionsOfAllAttributes = await findAllAttributeOptions({ teamId });
  const attributeOptionsMap = new Map<
    AttributeId,
    {
      id: string;
      value: string;
      slug: string;
      contains: string[];
      isGroup: boolean;
    }[]
  >();
  allOptionsOfAllAttributes.forEach((_attributeOption) => {
    const { attribute, ...attributeOption } = _attributeOption;
    const existingOptionsArray = attributeOptionsMap.get(attribute.id);
    if (!existingOptionsArray) {
      attributeOptionsMap.set(attribute.id, [attributeOption]);
    } else {
      // We already have the options for this attribute
      existingOptionsArray.push(attributeOption);
    }
  });
  return attributeOptionsMap;
};

export const getWhereClauseForAttributeOptionsManagedByCalcom = () => {
  // Neither created nor updated by DSync
  return {
    createdByDSyncId: null,
    // An option created by Cal.com can be updated by DSync, in that case the ownership is transferred to DSync
    updatedByDSyncId: null,
  };
};

export const findAssignmentsForMember = async ({ memberId }: { memberId: number }) => {
  const assignments = await AttributeToUserRepository.findManyIncludeAttribute({ memberId });
  return assignments.map((assignment) => ({
    ...assignment,
    attributeOption: {
      ...assignment.attributeOption,
      label: assignment.attributeOption.value,
    },
  }));
};
