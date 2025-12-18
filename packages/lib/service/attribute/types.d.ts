import type { Attribute, AttributeToUser, AttributeOption } from "@calcom/prisma/client";
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
  attributeOption: Omit<AttributeOption, "value" | "isGroup" | "contains" | "id" | "attributeId"> & {
    label: string;
    attribute: Attribute;
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
