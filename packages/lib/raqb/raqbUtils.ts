import type { JsonGroup, JsonItem, JsonRule, JsonTree } from "react-awesome-query-builder";
import type { Config } from "react-awesome-query-builder";
import { Utils as QbUtils } from "react-awesome-query-builder";

import { getQueryBuilderConfigForAttributes } from "@calcom/app-store/routing-forms/lib/getQueryBuilderConfig";
import type { LocalRoute } from "@calcom/app-store/routing-forms/types/types";
import logger from "@calcom/lib/logger";
import type { dynamicFieldValueOperands, dynamicFieldValueOperandsResponse } from "@calcom/lib/raqb/types";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { safeStringify } from "@calcom/lib/safeStringify";
import type {
  AttributeOptionValueWithType,
  AttributeOptionValue,
  Attribute,
} from "@calcom/lib/service/attribute/server/getAttributes";
import { AttributeType } from "@calcom/prisma/enums";

const moduleLogger = logger.getSubLogger({ prefix: ["routing-forms/lib/raqbUtils"] });

function getFieldResponseValueAsLabel({
  field,
  fieldResponseValue,
}: {
  fieldResponseValue: dynamicFieldValueOperandsResponse[keyof dynamicFieldValueOperandsResponse]["value"];
  field: {
    type: string;
    options?: {
      id: string | null;
      label: string;
    }[];
  };
}) {
  if (!field.options) {
    return fieldResponseValue;
  }

  const valueArray = fieldResponseValue instanceof Array ? fieldResponseValue : [fieldResponseValue];

  const chosenOptions = valueArray.map((idOrLabel) => {
    const foundOptionById = field.options?.find((option) => {
      return option.id === idOrLabel;
    });
    if (foundOptionById) {
      return {
        label: foundOptionById.label,
        id: foundOptionById.id,
      };
    } else {
      return {
        label: idOrLabel.toString(),
        id: null,
      };
    }
  });

  return chosenOptions.map((option) => option.label);
}

function ensureArray(value: string | string[]) {
  return typeof value === "string" ? [value] : value;
}

function caseInsensitive<T extends string | string[]>(
  stringOrStringArray: T
): T extends string[] ? string[] : string {
  return (
    stringOrStringArray instanceof Array
      ? stringOrStringArray.map((string) => string.toLowerCase())
      : stringOrStringArray.toLowerCase()
  ) as T extends string[] ? string[] : string;
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

/**
 * Replace attribute option Ids with the attribute option label(compatible to be matched with form field value)
 */
const replaceAttributeOptionIdsWithOptionLabel = ({
  queryValueString,
  attributes,
}: {
  queryValueString: string;
  attributes: Attribute[];
}) => {
  const allAttributesOptions = attributes.map((attribute) => attribute.options).flat();
  // Because all attribute option Ids are unique, we can reliably identify them along any number of attribute options of different attributes
  allAttributesOptions.forEach((attributeOption) => {
    const attributeOptionId = attributeOption.id;
    queryValueString = queryValueString.replace(
      new RegExp(`${attributeOptionId}`, "g"),
      caseInsensitive(attributeOption.value)
    );
  });
  return queryValueString;
};

/**
 * Replace {field:<fieldId>} with the field label(compatible to be matched with attribute value)
 */
const replaceFieldTemplateVariableWithOptionLabel = ({
  queryValueString,
  dynamicFieldValueOperands,
}: {
  queryValueString: string;
  dynamicFieldValueOperands?: dynamicFieldValueOperands;
}) => {
  if (!dynamicFieldValueOperands) {
    return queryValueString;
  }
  const { fields, response } = dynamicFieldValueOperands;
  return queryValueString.replace(/{field:([\w-]+)}/g, (match, fieldId: string) => {
    const field = fields?.find((f) => f.id === fieldId);
    if (!field) {
      moduleLogger.debug("field not found", safeStringify({ fieldId }));
      return match;
    }
    const fieldResponseValue = response[fieldId]?.value;
    if (!fieldResponseValue) {
      return match;
    }
    const responseValueAsLabel = getFieldResponseValueAsLabel({ field, fieldResponseValue });
    moduleLogger.debug("matchingOptionLabel", safeStringify({ responseValueAsLabel, response, fieldId }));
    if (responseValueAsLabel instanceof Array && responseValueAsLabel.length > 1) {
      throw new Error("Array value not supported with 'Value of field'");
    }
    return responseValueAsLabel ? caseInsensitive(responseValueAsLabel.toString()) : match;
  });
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
      console.log("A group option found. Using all its sub-options instead", safeStringify(subOptions));
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

  const attributesQueryValueCompatibleForMatchingWithFormField: AttributesQueryValue = JSON.parse(
    replaceFieldTemplateVariableWithOptionLabel({
      queryValueString: replaceAttributeOptionIdsWithOptionLabel({
        queryValueString: JSON.stringify(attributesQueryValue),
        attributes,
      }),
      dynamicFieldValueOperands,
    })
  );

  return attributesQueryValueCompatibleForMatchingWithFormField;
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
};
