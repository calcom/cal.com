import type { JsonGroup, JsonItem, JsonRule, JsonTree, JsonCaseGroup } from "@react-awesome-query-builder/core";
import type { Config } from "@react-awesome-query-builder/core";
import { Utils as QbUtils } from "@react-awesome-query-builder/core";

import { getQueryBuilderConfigForAttributes } from "@calcom/app-store/routing-forms/lib/getQueryBuilderConfig";
import type { LocalRoute } from "@calcom/app-store/routing-forms/types/types";
import { resolveQueryValue } from "@calcom/lib/raqb/resolveQueryValue";
import type { dynamicFieldValueOperands } from "@calcom/lib/raqb/types";
import { caseInsensitive } from "@calcom/lib/raqb/utils";
import type {
  AttributeOptionValueWithType,
  AttributeOptionValue,
  Attribute,
} from "@calcom/lib/service/attribute/server/getAttributes";
import { AttributeType } from "@calcom/prisma/enums";

/**
 * Normalized JsonTree type where children1 is a Record instead of an array.
 * This is used for storage/schema compatibility.
 */
export type NormalizedJsonTree = Omit<JsonTree, "children1"> & {
  children1?: Record<string, JsonItem | JsonCaseGroup>;
};

function ensureArray(value: string | string[]) {
  return typeof value === "string" ? [value] : value;
}

export const raqbQueryValueUtils = {
  isQueryValueARuleGroup: function isQueryValueARuleGroup(queryValue: JsonTree): queryValue is JsonGroup {
    return queryValue.type === "group";
  },
  isARule: function isARule(rule: JsonItem): rule is JsonRule {
    return rule.type === "rule";
  },
  getValueTypeFromAttributesQueryValueForRaqbField:
    function getValueTypeFromAttributesQueryValueForRaqbField({
      attributesQueryValue,
      raqbFieldId,
    }: {
      attributesQueryValue: JsonTree;
      raqbFieldId: string;
    }) {
      if (!raqbQueryValueUtils.isQueryValueARuleGroup(attributesQueryValue)) {
        return null;
      }

      if (!attributesQueryValue.children1) {
        return null;
      }

      let raqbFieldValueType = null;

      Object.values(attributesQueryValue.children1).reduce((acc, rule) => {
        if (!raqbQueryValueUtils.isARule(rule)) {
          return acc;
        }
        const ruleProperties = rule?.properties;
        if (!ruleProperties) {
          return acc;
        }
        if (ruleProperties.field === raqbFieldId) {
          raqbFieldValueType = ruleProperties.valueType?.[0];
        }
        return acc;
      }, null);

      return raqbFieldValueType;
    },
  isQueryValueEmpty: function isQueryValueEmpty(queryValue: JsonTree | null): queryValue is null {
    if (!queryValue) {
      return true;
    }
    return !queryValue.children1;
  },
};

export function buildEmptyQueryValue() {
  return { id: QbUtils.uuid(), type: "group" as const };
}

/**
 * Normalizes RAQB v6 JsonTree format to match the expected schema format.
 * Converts children1 from array to record (keyed by rule IDs) and cleans up optional fields.
 */
export function normalizeRaqbJsonTree(tree: JsonTree | null | undefined): NormalizedJsonTree | null {
  if (!tree) {
    return null;
  }

  const { children1, ...rest } = tree;
  const normalized: NormalizedJsonTree = { ...rest };

  if (children1) {
    const isJsonItemArray = (arr: unknown): arr is JsonItem[] =>
      Array.isArray(arr) && arr.every((c) => c && typeof c === "object" && "type" in c);
    const isJsonCaseGroupArray = (arr: unknown): arr is JsonCaseGroup[] =>
      Array.isArray(arr) && arr.every((c) => c && typeof c === "object" && "case" in c);

    if (isJsonItemArray(children1)) {
      const children1Record: Record<string, JsonItem | JsonCaseGroup> = {};
      children1.forEach((child) => {
        if (child.id) {
          const normalizedChild = child.type === "group" 
            ? normalizeRaqbJsonTree(child as JsonTree) 
            : child;
          if (normalizedChild) {
            children1Record[child.id] = normalizedChild as JsonItem;
          }
        }
      });
      normalized.children1 = children1Record;
    } else if (isJsonCaseGroupArray(children1)) {
      const children1Record: Record<string, JsonItem | JsonCaseGroup> = {};
      children1.forEach((child) => {
        if (child.id) {
          children1Record[child.id] = child;
        }
      });
      normalized.children1 = children1Record;
    } else {
      const normalizedChildren: Record<string, JsonItem | JsonCaseGroup> = {};
      Object.entries(children1).forEach(([key, child]) => {
        if (child && typeof child === "object" && "type" in child) {
          const normalizedChild = child.type === "group"
            ? normalizeRaqbJsonTree(child as JsonTree)
            : child;
          if (normalizedChild) {
            normalizedChildren[key] = normalizedChild as JsonItem | JsonCaseGroup;
          }
        }
      });
      normalized.children1 = normalizedChildren;
    }
  }

  return normalized;
}

export const buildStateFromQueryValue = ({
  queryValue,
  config,
}: {
  /**
   * Allow null as the queryValue as initially there could be no queryValue and without that we can't build the state and can't show the UI
   */
  queryValue: JsonTree | null;
  config: Config;
}) => {
  const queryValueToUse = queryValue || buildEmptyQueryValue();
  const immutableTree = QbUtils.checkTree(QbUtils.loadTree(queryValueToUse), config);
  return {
    state: {
      tree: immutableTree,
      config,
    },
    queryValue: QbUtils.getTree(immutableTree),
  };
};

export function getValueOfAttributeOption(
  attributeOptions:
    | Pick<AttributeOptionValue, "isGroup" | "contains" | "value">
    | Pick<AttributeOptionValue, "isGroup" | "contains" | "value">[]
) {
  if (!(attributeOptions instanceof Array)) {
    return transformAttributeOption(attributeOptions);
  }
  return attributeOptions
    .map(transformAttributeOption)
    .flat()
    .filter((value, index, self) => self.indexOf(value) === index);

  function transformAttributeOption(
    attributeOption: Pick<AttributeOptionValue, "isGroup" | "contains" | "value">
  ) {
    if (attributeOption.isGroup) {
      const subOptions = attributeOption.contains.map((option) => option.value);
      return subOptions;
    }
    return attributeOption.value;
  }
}

function getAttributesData({
  attributesData,
}: {
  attributesData: Record<string, AttributeOptionValueWithType>;
  attributesQueryValue: NonNullable<LocalRoute["attributesQueryValue"]>;
}) {
  return Object.entries(attributesData).reduce(
    (acc, [attributeId, { type: attributeType, attributeOption }]) => {
      const compatibleValueForAttributeAndFormFieldMatching = caseInsensitive(
        getValueOfAttributeOption(attributeOption)
      );

      acc[attributeId] =
        // multiselect attribute's value must be an array as all the operators multiselect_some_in, multiselect_all_in and their respective not operators expect an array
        // If we add an operator that doesn't expect an array, we need to somehow make it operator based.
        attributeType === AttributeType.MULTI_SELECT
          ? ensureArray(compatibleValueForAttributeAndFormFieldMatching)
          : compatibleValueForAttributeAndFormFieldMatching;

      return acc;
    },
    {} as Record<string, string | string[]>
  );
}
/** Gets the attributes that were used to generate the chosen route and their values */
function getAttributesQueryValue({
  attributesQueryValue,
  attributes,
  dynamicFieldValueOperands,
}: {
  attributesQueryValue: LocalRoute["attributesQueryValue"] | null;
  attributes: Attribute[];
  dynamicFieldValueOperands?: dynamicFieldValueOperands;
}) {
  if (!attributesQueryValue) {
    return null;
  }

  const resolvedQueryValue = resolveQueryValue({
    queryValue: attributesQueryValue,
    attributes,
    dynamicFieldValueOperands,
  });

  return resolvedQueryValue;
}

/**
 * Returns attributesQueryBuilderConfig with the list of labels instead of list of ids.
 */
export function getAttributesQueryBuilderConfigHavingListofLabels({
  dynamicFieldValueOperands,
  attributes,
}: {
  dynamicFieldValueOperands?: dynamicFieldValueOperands;
  attributes: Attribute[];
}) {
  const attributesQueryBuilderConfig = getQueryBuilderConfigForAttributes({
    attributes,
    dynamicOperandFields: dynamicFieldValueOperands?.fields,
  });

  const attributesQueryBuilderConfigFieldsWithCompatibleListValues = Object.fromEntries(
    Object.entries(attributesQueryBuilderConfig.fields).map(([raqbFieldId, raqbField]) => {
      const raqbFieldType = raqbField.type;

      return [
        raqbFieldId,
        {
          ...raqbField,
          type: raqbFieldType,
          fieldSettings: {
            ...raqbField.fieldSettings,
            listValues: raqbField.fieldSettings.listValues?.map((option) => {
              return {
                ...option,
                // Use the title(which is the attributeOption.value) as the value of the raqb field so that it can be compatible for matching with the form field value
                value: caseInsensitive(option.title),
              };
            }),
          },
        },
      ];
    })
  );

  const attributesQueryBuilderConfigWithCompatibleListValues = {
    ...attributesQueryBuilderConfig,
    fields: attributesQueryBuilderConfigFieldsWithCompatibleListValues,
  };

  return attributesQueryBuilderConfigWithCompatibleListValues;
}

/**
 * Utilities to establish compatibility between formFieldQueryValue and attributeQueryValue
 */
export const acrossQueryValueCompatiblity = {
  getAttributesQueryBuilderConfigHavingListofLabels,
  getAttributesQueryValue,
  getAttributesData,
  resolveQueryValue,
};
