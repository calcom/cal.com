import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { AttributeRepository } from "../server/repository/attribute";
import { AttributeToUserRepository } from "../server/repository/attributeToUser";
import { MembershipRepository } from "../server/repository/membership";

const log = logger.getSubLogger({ prefix: ["entity", "attribute"] });

type AttributeName = string;

const findAttributesByName = async ({
  orgId,
  attributeNames,
}: {
  orgId: number;
  attributeNames: AttributeName[];
}) => {
  const attributesFromDb = await AttributeRepository.findManyByNames({ attributeNames, orgId });

  return attributesFromDb.map((attribute) => {
    const { name, options, id, slug, enabled } = attribute;

    return {
      id,
      label: name,
      slug,
      enabled,
      options: options.map((option) => {
        const { value, slug, id } = option;
        return {
          id,
          label: value,
          slug,
        };
      }),
    };
  });
};

const lookupByLabel = <TWithLabel extends { label: string }>({
  label,
  items,
}: {
  label: string;
  items: TWithLabel[];
}) => {
  return items.find((item) => item.label.toLowerCase() === label.toLowerCase());
};

const setValueForUser = async ({
  orgId,
  userId,
  attributeLabelToValueMap,
}: {
  orgId: number;
  userId: number;
  attributeLabelToValueMap: Record<AttributeName, string>;
}) => {
  const membership = await MembershipRepository.findFirstByUserIdAndTeamId({ userId, teamId: orgId });
  if (!membership) {
    console.error(`User ${userId} not a member of org ${orgId}. Ignoring attribute set`);
    return { numOfAttributeOptionsSet: 0 };
  }
  const { id: memberId } = membership;
  return setValueForMember({ orgId, memberId, attributeLabelToValueMap });
};

export const setValueForMember = async ({
  orgId,
  memberId,
  attributeLabelToValueMap,
}: {
  orgId: number;
  memberId: number;
  attributeLabelToValueMap: Record<AttributeName, string>;
}) => {
  const allMatchingAttributes = await findAttributesByName({
    orgId,
    attributeNames: Object.keys(attributeLabelToValueMap),
  });

  console.log({ allMatchingAttributes: safeStringify(allMatchingAttributes) });

  if (!allMatchingAttributes.length) {
    console.warn(`No attributes defined in org ${orgId}`);
    return { numOfAttributeOptionsSet: 0 };
  }

  const attributeOptionsToSet = Object.entries(attributeLabelToValueMap)
    .map(([attributeLabel, value]) => {
      const attribute = lookupByLabel({ label: attributeLabel, items: allMatchingAttributes });
      if (!attribute) {
        console.warn(`Attribute ${attributeLabel} not found`);
        return null;
      }
      const option = lookupByLabel({ label: value, items: attribute.options });
      if (!option) {
        console.warn(`Option ${value} not found for attribute ${attributeLabel}`);
        return null;
      }

      return {
        attributeOptionId: option.id,
        memberId,
      };
    })
    .filter((option): option is NonNullable<typeof option> => option !== null);

  console.log({ attributeOptionsToSet: safeStringify(attributeOptionsToSet) });

  // FIXME: We need to also delete any existing options, so it is a complete reset.
  const { count: numOfAttributeOptionsSet } = await AttributeToUserRepository.createMany(
    attributeOptionsToSet
  );

  return { numOfAttributeOptionsSet };
};

export const attribute = {
  setValueForUser,
};
