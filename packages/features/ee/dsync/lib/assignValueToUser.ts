import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { PrismaAttributeOptionRepository } from "@calcom/lib/server/repository/PrismaAttributeOptionRepository";
import { PrismaAttributeRepository } from "@calcom/lib/server/repository/PrismaAttributeRepository";
import { findAssignmentsForMember } from "@calcom/lib/service/attribute/server/utils";
import type {
  AttributeId,
  AttributeName,
  BulkAttributeAssigner,
  AttributeOptionAssignment,
} from "@calcom/lib/service/attribute/types";
import {
  doesSupportMultipleValues,
  isAssignmentForLockedAttribute,
  isAssignmentForTheSamePool,
  isAssignmentSame,
  buildSlugFromValue,
  canSetValueBeyondOptions,
} from "@calcom/lib/service/attribute/utils";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["entity/attribute"] });

type AttributesIncludingOptions = Awaited<ReturnType<typeof findAttributesByName>>[number];
type AttributeOptionsToAssign = {
  attribute: { id: AttributeId; isLocked: boolean };
  optionsToAssign: { id: string | null; label: string }[];
};

type AttributeOptionsToAssignWithIdEnsured = {
  attribute: { id: AttributeId; isLocked: boolean };
  optionsToAssign: { id: string; label: string }[];
};
type AttributeLabelToValueMap = Record<AttributeName, string | string[]>;

const findAttributesByName = async ({
  orgId,
  attributeNames,
}: {
  orgId: number;
  attributeNames: AttributeName[];
}) => {
  const attributeRepo = new PrismaAttributeRepository(prisma);
  const attributesFromDb = await attributeRepo.findManyByNamesAndOrgIdIncludeOptions({
    attributeNames,
    orgId,
  });

  return attributesFromDb.map((attribute) => {
    const { name, options, ...rest } = attribute;

    return {
      ...rest,
      label: name,
      options: options.map((option) => {
        return {
          ...option,
          label: option.value,
        };
      }),
    };
  });
};

const lookupByLabels = <TWithLabel extends { label: string }>({
  labels,
  items,
}: {
  labels: string[];
  items: TWithLabel[];
}) => {
  const map = new Map<string, TWithLabel | null>();
  labels.forEach((label) => {
    map.set(label, items.find((item) => item.label.toLowerCase() === label.toLowerCase()) ?? null);
  });
  return map;
};

const lookupByLabel = <TWithLabel extends { label: string }>({
  label,
  items,
}: {
  label: string;
  items: TWithLabel[];
}) => {
  const map = lookupByLabels({ labels: [label], items });
  return map.get(label);
};

export const buildPrismaQueriesForAttributeOptionToUser = ({
  existingAttributeOptionAssignments,
  attributeOptionsToAssign,
  updater,
  memberId,
}: {
  orgId: number;
  memberId: number;
  existingAttributeOptionAssignments: AttributeOptionAssignment[];
  attributeOptionsToAssign: AttributeOptionsToAssignWithIdEnsured[];
  updater: BulkAttributeAssigner;
}) => {
  const assignmentsToUpdateIds: string[] = [];
  if (!attributeOptionsToAssign.length) {
    log.debug("No attribute options to assign, skipping");
    return {
      attributeToUserCreateManyInput: [],
      attributeToUserUpdateManyInput: null,
      attributeToUserDeleteQueries: {
        locked: null,
        unlocked: null,
      },
    };
  }
  const { attributeToUserCreateManyInput } = attributeOptionsToAssign.reduce(
    (acc, attributeOptionsToAssign) => {
      const existingAttributeOptionAssignment = existingAttributeOptionAssignments.find(
        (existingAttributeOptionForMember) => existingAttributeOptionForMember.attributeOption.attribute.id
      );

      // Prevent overriding the only value for an unlocked attribute
      if (
        existingAttributeOptionAssignment &&
        !isAssignmentForLockedAttribute({
          assignment: existingAttributeOptionAssignment,
        }) &&
        !doesSupportMultipleValues({
          attribute: existingAttributeOptionAssignment.attributeOption.attribute,
        }) &&
        !isAssignmentForTheSamePool({
          assignment: existingAttributeOptionAssignment,
          updater,
        })
      ) {
        console.warn(
          `Attribute ${existingAttributeOptionAssignment.attributeOption.attribute.id} already assigned to user ${memberId} and is not a multi-select attribute. So, skipping`
        );
        return acc;
      }

      attributeOptionsToAssign.optionsToAssign.forEach((optionToAssign) => {
        // Prevent unnecessary recreation of the assignment, to avoid resetting the "weight"
        if (
          existingAttributeOptionAssignment &&
          isAssignmentSame({
            existingAssignment: existingAttributeOptionAssignment,
            newOption: optionToAssign,
          })
        ) {
          log.debug(
            `Updating existing assignment ${existingAttributeOptionAssignment.id} as it has same value`
          );
          assignmentsToUpdateIds.push(existingAttributeOptionAssignment.id);
          return;
        }

        acc.attributeToUserCreateManyInput.push({
          memberId,
          attributeOptionId: optionToAssign.id,
          ...("dsyncId" in updater
            ? { createdByDSyncId: updater.dsyncId, createdById: null }
            : {
                createdById: updater.userId,
                createdByDSyncId: null,
              }),
        });
      });

      return acc;
    },
    {
      attributeToUserCreateManyInput: [] as {
        memberId: number;
        attributeOptionId: string;
        createdByDSyncId: string | null;
        createdById: number | null;
      }[],
    }
  );

  const lockedAttributeIds = attributeOptionsToAssign
    .filter((option) => option.attribute.isLocked)
    .map((option) => option.attribute.id);

  const unlockedAttributeIds = attributeOptionsToAssign
    .filter((option) => !option.attribute.isLocked)
    .map((option) => option.attribute.id);

  const unlockedAttributesAssignmentIdsInThePool = existingAttributeOptionAssignments
    .filter((assignment) => {
      return (
        isAssignmentForTheSamePool({
          assignment,
          updater,
        }) && unlockedAttributeIds.includes(assignment.attributeOption.attribute.id)
      );
    })
    .map((existingAttributeOptionForMember) => existingAttributeOptionForMember.id);

  const unlockedAttributesAssignmentIdsInThePoolWhichAreAllowedToBeCreated =
    unlockedAttributesAssignmentIdsInThePool.filter((id) => !assignmentsToUpdateIds.includes(id));
  const attributeToUserDeleteQueryWhereClauseForUnlockedAttributes =
    unlockedAttributesAssignmentIdsInThePoolWhichAreAllowedToBeCreated.length
      ? scopedWhereClause({
          memberId,
          whereClause: {
            id: {
              in: unlockedAttributesAssignmentIdsInThePoolWhichAreAllowedToBeCreated,
            },
          },
        })
      : null;

  const attributeToUserDeleteQueryWhereClauseForLockedAttributes = lockedAttributeIds.length
    ? scopedWhereClause({
        memberId,
        whereClause: {
          ...(assignmentsToUpdateIds.length
            ? {
                id: {
                  notIn: assignmentsToUpdateIds,
                },
              }
            : null),
          // No matter who assigned the attribute(Cal.com or SCIM), we delete it because the source of truth is SCIM and only one SCIM can be be source of truth at one time.
          attributeOption: {
            attribute: {
              id: {
                in: lockedAttributeIds,
              },
            },
          },
        },
      })
    : null;

  const attributeToUserUpdateManyInput = assignmentsToUpdateIds.length
    ? {
        where: scopedWhereClause({
          memberId,
          whereClause: {
            id: {
              in: assignmentsToUpdateIds,
            },
          },
        }),
        data: {
          ...("dsyncId" in updater
            ? { updatedByDSyncId: updater.dsyncId, updatedById: null }
            : {
                updatedById: updater.userId,
                updatedByDSyncId: null,
              }),
        },
      }
    : null;

  log.debug("buildPrismaQueriesForAttributeOptionToUser", {
    assignmentsToUpdateIds,
    lockedAttributeIds,
    unlockedAttributesAssignmentIdsInThePool,
    unlockedAttributeIds,
    existingAttributeOptionAssignments,
    updater,
    attributeToUserDeleteQueryWhereClauseForLockedAttributes: safeStringify(
      attributeToUserDeleteQueryWhereClauseForLockedAttributes
    ),
    attributeToUserDeleteQueryWhereClauseForUnlockedAttributes: safeStringify(
      attributeToUserDeleteQueryWhereClauseForUnlockedAttributes
    ),
    attributeToUserCreateManyInput: safeStringify(attributeToUserCreateManyInput),
    attributeToUserUpdateManyInput,
  });

  return {
    attributeToUserUpdateManyInput,
    attributeToUserCreateManyInput,
    attributeToUserDeleteQueries: {
      locked: attributeToUserDeleteQueryWhereClauseForLockedAttributes,
      unlocked: attributeToUserDeleteQueryWhereClauseForUnlockedAttributes,
    },
  };

  function scopedWhereClause<TWhereClause extends object | null>({
    memberId,
    whereClause,
  }: {
    memberId: number;
    whereClause: TWhereClause;
  }) {
    return {
      ...whereClause,
      memberId,
    };
  }
};

const buildPrismaQueryForAttributeOptionCreation = ({
  optionsToCreate,
}: {
  optionsToCreate: Record<AttributeId, string[]>;
}) => {
  const attributeOptionCreateManyInput = Object.entries(optionsToCreate).map(([attributeId, options]) =>
    options.map((option) => ({
      attributeId,
      value: option,
      slug: buildSlugFromValue({ value: option }),
    }))
  );
  return attributeOptionCreateManyInput.flat();
};

const createMissingOptionsAndReturnAlongWithExisting = async <
  TattributeOptionsToAssign extends AttributeOptionsToAssign
>({
  attributeOptionsToAssignIncludingNonExistentOptions,
  orgId,
}: {
  attributeOptionsToAssignIncludingNonExistentOptions: TattributeOptionsToAssign[];
  orgId: number;
}) => {
  const attributeOptionCreateManyInput = buildPrismaQueryForAttributeOptionCreation({
    optionsToCreate: attributeOptionsToAssignIncludingNonExistentOptions.reduce(
      (acc, attributeOptionsToAssign) => {
        const { attribute, optionsToAssign } = attributeOptionsToAssign;
        acc[attribute.id] = optionsToAssign.filter((option) => !option.id).map((option) => option.label);
        return acc;
      },
      {} as Record<AttributeId, string[]>
    ),
  });

  await PrismaAttributeOptionRepository.createMany({
    createManyInput: attributeOptionCreateManyInput,
  });

  // We need fetch all the attribute options to ensure that we have the newly created options as well.
  const allAttributeOptions = (
    await PrismaAttributeOptionRepository.findMany({
      orgId,
    })
  ).map((attributeOption) => ({
    ...attributeOption,
    label: attributeOption.value,
  }));

  return attributeOptionsToAssignIncludingNonExistentOptions.map(({ attribute, optionsToAssign }) => {
    const optionsWithIdsOfTheSameAttribute = optionsToAssign
      .map((option) =>
        allAttributeOptions.find(
          (attributeOption) =>
            attributeOption.attributeId === attribute.id &&
            attributeOption.label.toLowerCase() === option.label.toLowerCase()
        )
      )
      .filter((option): option is NonNullable<typeof option> => option !== null);
    return {
      attribute,
      optionsToAssign: optionsWithIdsOfTheSameAttribute,
    };
  });
};

const buildAttributeOptionsToAssign = async ({
  attributeLabelToValueMap,
  allAttributesBeingAssigned,
  orgId,
}: {
  attributeLabelToValueMap: AttributeLabelToValueMap;
  allAttributesBeingAssigned: AttributesIncludingOptions[];
  orgId: number;
}) => {
  const attributeOptionsToAssignIncludingNonExistentOptions = Object.entries(attributeLabelToValueMap)
    .map(([attributeLabel, value]) => {
      const valueAsArray = value instanceof Array ? value : [value];
      const attribute = lookupByLabel({ label: attributeLabel, items: allAttributesBeingAssigned });
      if (!attribute) {
        console.warn(`Attribute ${attributeLabel} not found, will not be assigned to user`);
        return null;
      }

      const labelToFoundOptionMap = lookupByLabels({ labels: valueAsArray, items: attribute.options });
      const labelsEntries = Array.from(labelToFoundOptionMap.entries());
      const optionsToAssign = labelsEntries
        .filter(([_, option]) => {
          return canSetValueBeyondOptions({ attribute }) ? true : !!option;
        })
        .map(([label]) => {
          const foundLabel = labelToFoundOptionMap.get(label) ?? null;
          return {
            label,
            ...foundLabel,
          };
        });

      return {
        attribute,
        optionsToAssign: optionsToAssign.map((option) => ({
          label: option.label,
          id: option.id ?? null,
        })),
      };
    })
    .filter((option): option is NonNullable<typeof option> => option !== null);

  return createMissingOptionsAndReturnAlongWithExisting({
    attributeOptionsToAssignIncludingNonExistentOptions,
    orgId,
  });
};

/**
 * For a user in an org, it assigns all the attributes with their values as per the attributeLabelToValueMap.
 */
export const assignValueToUserInOrgBulk = async ({
  orgId,
  userId,
  attributeLabelToValueMap,
  updater,
}: {
  orgId: number;
  userId: number;
  attributeLabelToValueMap: AttributeLabelToValueMap;
  updater: BulkAttributeAssigner;
}) => {
  const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({ userId, teamId: orgId });
  const defaultReturn = { numOfAttributeOptionsSet: 0, numOfAttributeOptionsDeleted: 0 };
  if (!membership) {
    console.error(`User ${userId} not a member of org ${orgId}, not assigning attribute options`);
    return defaultReturn;
  }

  const { id: memberId } = membership;
  const attributeNames = Object.keys(attributeLabelToValueMap);

  const allAttributesBeingAssigned = await findAttributesByName({
    orgId,
    attributeNames,
  });

  if (!allAttributesBeingAssigned.length) {
    console.warn(`None of the attributes ${attributeNames.join(", ")} found in org ${orgId}`);
    return defaultReturn;
  }

  const attributeOptionsToAssign = await buildAttributeOptionsToAssign({
    attributeLabelToValueMap,
    allAttributesBeingAssigned,
    orgId,
  });

  // We need to fetch all the assigned options even those that aren't being set directly in call.
  // We need to decide on the fate of all existing assignments
  const existingAttributeOptionAssignments = await findAssignmentsForMember({ memberId });

  const { attributeToUserUpdateManyInput, attributeToUserCreateManyInput, attributeToUserDeleteQueries } =
    buildPrismaQueriesForAttributeOptionToUser({
      orgId,
      memberId,
      attributeOptionsToAssign,
      existingAttributeOptionAssignments,
      updater,
    });

  const { numOfAttributeOptionsDeleted, numOfAttributeOptionsSet, numOfAttributeOptionsUpdated } =
    await prisma.$transaction(async (tx) => {
      // First delete all existing options, to allow them to be set again.
      const deleteQueriesResult = await Promise.all(
        Object.entries(attributeToUserDeleteQueries).map(([_, attributeToUserDeleteQuery]) =>
          attributeToUserDeleteQuery
            ? tx.attributeToUser.deleteMany({
                where: attributeToUserDeleteQuery,
              })
            : Promise.resolve({ count: 0 })
        )
      );

      // Then set the new options.
      const { count: numOfAttributeOptionsSet } = await tx.attributeToUser.createMany({
        data: attributeToUserCreateManyInput,
        // In case the values already exist, we skip them instead of throwing an error.
        skipDuplicates: true,
      });

      let numOfAttributeOptionsUpdated = 0;
      if (attributeToUserUpdateManyInput) {
        ({ count: numOfAttributeOptionsUpdated } = await tx.attributeToUser.updateMany({
          where: attributeToUserUpdateManyInput?.where,
          data: attributeToUserUpdateManyInput?.data,
        }));
      }

      const numOfAttributeOptionsDeleted = deleteQueriesResult.reduce(
        (acc, query) => acc + (query.count ?? 0),
        0
      );

      return {
        numOfAttributeOptionsDeleted,
        numOfAttributeOptionsSet,
        numOfAttributeOptionsUpdated,
      };
    });

  log.debug({
    numOfAttributeOptionsSet,
    numOfAttributeOptionsDeleted,
    numOfAttributeOptionsUpdated,
  });

  return {
    numOfAttributeOptionsSet,
    numOfAttributeOptionsDeleted,
    numOfAttributeOptionsUpdated,
  };
};
