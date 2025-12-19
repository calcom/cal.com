import type { Attribute, AttributeToUser, AttributeOption } from "@calcom/prisma/client";
import type { AttributeType } from "@calcom/prisma/enums";

export { Attribute, AttributeOption };

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

export type AttributeOptionValueWithType = {
  type: AttributeType;
  attributeOption: AttributeOption | AttributeOption[];
};
