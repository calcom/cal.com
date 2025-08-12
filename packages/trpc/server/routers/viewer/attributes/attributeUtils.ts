import { safeStringify } from "@calcom/lib/safeStringify";
import slugify from "@calcom/lib/slugify";
import type { PrismaTransaction } from "@calcom/prisma";
import type { AttributeType } from "@calcom/prisma/enums";

type SimpleAttributeInput = {
  id: string;
  value: string;
};

type SelectAttributeInput = {
  id: string;
  options: { value: string }[];
  type: AttributeType;
};

type AttributeInput = {
  id: string;
  value?: string;
  options?: { value: string }[];
  type?: AttributeType;
};

type ProcessAttributesResult = {
  userId: number;
  success: boolean;
  message?: string;
};

const isSimpleAttribute = (type: AttributeType) => {
  return type === "TEXT" || type === "NUMBER";
};

const isSelectAttribute = (type: AttributeType) => {
  return type === "SINGLE_SELECT" || type === "MULTI_SELECT";
};

export const processUserAttributes = async (
  tx: PrismaTransaction,
  userId: number,
  teamId: number,
  attributes: AttributeInput[]
): Promise<ProcessAttributesResult> => {
  const membership = await tx.membership.findFirst({
    where: {
      userId,
      teamId,
    },
  });

  if (!membership) {
    return {
      userId,
      success: false,
      message: "User is not part of your organization",
    };
  }

  for (const attribute of attributes) {
    if (!attribute.type) {
      console.log("Skipping attribute without type", safeStringify(attribute));
      continue;
    }

    if (isSimpleAttribute(attribute.type) && attribute.value) {
      await handleSimpleAttribute(tx, membership.id, {
        id: attribute.id,
        value: attribute.value,
      });
    } else if (isSelectAttribute(attribute.type) && attribute.options?.length) {
      await handleSelectAttribute(tx, membership.id, {
        id: attribute.id,
        options: attribute.options,
        type: attribute.type,
      });
    } else if (attribute.type && !attribute.value && !attribute.options?.length) {
      // Handle attribute removal
      await removeAttribute(tx, membership.id, attribute.id);
    }
  }

  return {
    userId,
    success: true,
  };
};

export const handleSimpleAttribute = async (
  tx: PrismaTransaction,
  memberId: number,
  attribute: SimpleAttributeInput
) => {
  const valueAsString = String(attribute.value);

  const existingAttributeOption = await tx.attributeToUser.findFirst({
    where: {
      memberId,
      attributeOption: {
        attribute: {
          id: attribute.id,
        },
      },
    },
    select: {
      id: true,
      attributeOption: {
        select: {
          id: true,
        },
      },
    },
  });

  if (existingAttributeOption) {
    // Update the value if it already exists
    await tx.attributeOption.update({
      where: {
        id: existingAttributeOption.attributeOption.id,
      },
      data: {
        value: valueAsString,
        slug: slugify(valueAsString),
      },
    });
  } else {
    await tx.attributeOption.create({
      data: {
        value: valueAsString,
        slug: slugify(valueAsString),
        attribute: {
          connect: {
            id: attribute.id,
          },
        },
        assignedUsers: {
          create: {
            memberId,
          },
        },
      },
    });
  }
};

export const handleSelectAttribute = async (
  tx: PrismaTransaction,
  memberId: number,
  attribute: SelectAttributeInput
) => {
  // For single select, first remove any existing options
  if (attribute.type === "SINGLE_SELECT") {
    await removeAttribute(tx, memberId, attribute.id);
  }

  for (const option of attribute.options) {
    await tx.attributeToUser.upsert({
      where: {
        memberId_attributeOptionId: {
          memberId,
          attributeOptionId: option.value,
        },
      },
      create: {
        memberId,
        attributeOptionId: option.value,
      },
      update: {}, // No update needed if it already exists
    });
  }
};

export const removeAttribute = async (tx: PrismaTransaction, memberId: number, attributeId: string) => {
  await tx.attributeToUser.deleteMany({
    where: {
      memberId,
      attributeOption: {
        attribute: {
          id: attributeId,
        },
      },
    },
  });
};
