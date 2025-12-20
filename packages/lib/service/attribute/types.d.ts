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

/**
 * AttributeOption type with transformed `contains` field.
 * In the database, `contains` is `string[]` (array of option IDs),
 * but after transformation in getAttributes.ts, it becomes an array of objects.
 */
export type TransformedAttributeOption = {
  isGroup: boolean;
  value: string;
  contains: { id: string; value: string; slug: string }[];
};

export type AttributeOptionValueWithType = {
  type: AttributeType;
  attributeOption: TransformedAttributeOption | TransformedAttributeOption[];
};
