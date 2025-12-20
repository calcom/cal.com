import type { Attribute, AttributeToUser } from "@calcom/prisma/client";
import type { AttributeType } from "@calcom/prisma/enums";

export type AttributeName = string;
export type AttributeId = string;
export type BulkAttributeAssigner =
  | {
      dsyncId: string;
    }
  | {
      userId: number;
    };

export type AttributeOptionAssignment = AttributeToUser & {
  attributeOption: {
    label: string;
    slug: string;
    attribute: Attribute;
    assignedUsers: AttributeToUser[];
  };
};

export type AttributeOptionValue = {
  isGroup: boolean;
  value: string;
  contains: { id: string; value: string; slug: string }[];
};

export type AttributeOptionValueWithType = {
  type: AttributeType;
  attributeOption: AttributeOptionValue | AttributeOptionValue[];
};
