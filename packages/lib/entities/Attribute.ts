import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

import { MembershipRepository } from "../server/repository/membership";

const log = logger.getSubLogger({ prefix: ["setAttributeOptions"] });

// TODO: Support setting multiple options per attribute?
type AttributeOptionLabel = string;
type AttributeName = string;

const lookupByLabel = <TWithLabel extends { label: string }>({
  label,
  items,
}: {
  label: string;
  items: TWithLabel[];
}) => {
  return items.find((item) => item.label.toLowerCase() === label.toLowerCase());
};

export const setAttributeOptions = async ({
  orgId,
  userId,
  attributeLabelToOptionLabelMap,
}: {
  orgId: number;
  userId: number;
  attributeLabelToOptionLabelMap: Record<AttributeName, AttributeOptionLabel>;
}) => {
  // FIXME: We need to see if the attribute is locked, then only we allow it to be set here.
  // If it is unlocked, SCIM can't update it here and cal.com is the source of truth.

  log.debug("setAttributeOptions", safeStringify({ orgId, userId, attributeLabelToOptionLabelMap }));
  const membership = await MembershipRepository.findFirstByUserIdAndTeamId({ userId, teamId: orgId });
  if (!membership) {
    console.error(`User ${userId} not a member of org ${orgId}`);
    return { numOfAttributeOptionsSet: 0 };
  }
  const { id: memberId } = membership;
  const allMatchingAttributes = await findAttributesByName({
    orgId,
    attributeNames: Object.keys(attributeLabelToOptionLabelMap),
  });

  console.log({ allMatchingAttributes: safeStringify(allMatchingAttributes) });

  const attributeOptionsToSet = Object.entries(attributeLabelToOptionLabelMap)
    .map(([attributeLabel, optionLabel]) => {
      const attribute = lookupByLabel({ label: attributeLabel, items: allMatchingAttributes });
      if (!attribute) {
        console.warn(`Attribute ${attributeLabel} not found`);
        return null;
      }
      const option = lookupByLabel({ label: optionLabel, items: attribute.options });
      if (!option) {
        console.warn(`Option ${optionLabel} not found for attribute ${attributeLabel}`);
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
  const { count: numOfAttributeOptionsSet } = await prisma.attributeToUser.createMany({
    data: attributeOptionsToSet,
  });

  return { numOfAttributeOptionsSet };
};

const findAttributesByName = async ({
  orgId,
  attributeNames,
}: {
  orgId: number;
  attributeNames: AttributeName[];
}) => {
  const attributesFromDb = await prisma.attribute.findMany({
    where: {
      name: { in: attributeNames, mode: "insensitive" },
      teamId: orgId,
    },
    include: {
      options: {
        select: {
          id: true,
          value: true,
          slug: true,
        },
      },
    },
  });

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
