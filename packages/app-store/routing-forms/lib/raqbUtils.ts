import type { App_RoutingForms_Form } from "@prisma/client";
import type { JsonGroup, JsonItem, JsonRule, JsonTree } from "react-awesome-query-builder";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { AttributeType } from "@calcom/prisma/enums";

import type { Attribute, AttributesQueryValue } from "../types/types";
import type { LocalRoute } from "../types/types";
import type { FormResponse, SerializableForm } from "../types/types";
import type { SerializableField } from "../types/types";
import type { AttributesQueryBuilderConfigWithRaqbFields } from "./getQueryBuilderConfig";
import { getQueryBuilderConfigForAttributes } from "./getQueryBuilderConfig";

const moduleLogger = logger.getSubLogger({ prefix: ["routing-forms/lib/raqbUtils"] });

type GetFieldResponse = ({
  field,
  fieldResponseValue,
}: {
  fieldResponseValue: FormResponse[keyof FormResponse]["value"];
  field: Pick<SerializableField, "type" | "options">;
}) => { value: string | number | string[] };

function ensureArray(value: string | string[]) {
  return typeof value === "string" ? [value] : value;
}

// We connect Form Field value and Attribute value using the labels lowercased
function compatibleForAttributeAndFormFieldMatch<T extends string | string[]>(
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
      compatibleForAttributeAndFormFieldMatch(attributeOption.value)
    );
  });
  return queryValueString;
};

/**
 * Replace {field:<fieldId>} with the field label(compatible to be matched with attribute value)
 */
const replaceFieldTemplateVariableWithOptionLabel = ({
  queryValueString,
  fields,
  response,
  getFieldResponse,
}: {
  queryValueString: string;
  fields: SerializableField[] | undefined;
  response: FormResponse;
  getFieldResponse: GetFieldResponse;
}) => {
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
    const { value: fieldValue } = getFieldResponse({ field, fieldResponseValue });
    moduleLogger.debug("matchingOptionLabel", safeStringify({ fieldValue, response, fieldId }));
    if (fieldValue instanceof Array && fieldValue.length > 1) {
      throw new Error("Array value not supported with 'Value of field'");
    }
    return fieldValue ? compatibleForAttributeAndFormFieldMatch(fieldValue.toString()) : match;
  });
};

/**
 * Utilities to handle compatiblity when attribute's type changes
 */
const attributeChangeCompatibility = {
  /**
   * FIXME: It isn't able to handle a case where for SINGLE_SELECT attribute, the queryValue->valueType is ["multiselect"]. It happens for select_any_in operator
   * So, don't use it till that is fixed.
   */
  getRaqbFieldTypeCompatibleWithQueryValue: function getRaqbFieldTypeCompatibleWithQueryValue({
    attributesQueryValue,
    raqbField,
    raqbFieldId,
  }: {
    attributesQueryValue: NonNullable<LocalRoute["attributesQueryValue"]>;
    raqbField: AttributesQueryBuilderConfigWithRaqbFields["fields"][string];
    raqbFieldId: string;
  }) {
    const fieldTypeFromAttributesQueryValue =
      raqbQueryValueUtils.getValueTypeFromAttributesQueryValueForRaqbField({
        attributesQueryValue,
        raqbFieldId,
      });
    if (raqbField.type === "select" && fieldTypeFromAttributesQueryValue === "multiselect") {
      // One could argue why not use fieldTypeFromAttributesQueryValue directly. This could potentially cause issues, so we do this only when we think it makes sense.
      moduleLogger.warn(
        `Switching field type from ${raqbField.type} to multiselect as the queryValue expects it to be so`
      );
      return "multiselect";
    }
    return raqbField.type;
  },
  /**
   * Ensure the attribute value if of type same as the valueType in queryValue
   * FIXME: It isn't able to handle a case where for SINGLE_SELECT attribute, the queryValue->valueType is ["multiselect"]. It happens for select_any_in operator
   * So, don't use it till that is fixed.
   */
  ensureAttributeValueToBeOfRaqbFieldValueType: function ensureAttributeValueToBeOfRaqbFieldValueType({
    attributeValue,
    attributesQueryValue,
    attributeId,
  }: {
    attributeValue: string | string[];
    attributesQueryValue: NonNullable<LocalRoute["attributesQueryValue"]>;
    attributeId: string;
  }) {
    const fieldTypeFromAttributesQueryValue =
      raqbQueryValueUtils.getValueTypeFromAttributesQueryValueForRaqbField({
        attributesQueryValue,
        raqbFieldId: attributeId,
      });

    if (fieldTypeFromAttributesQueryValue === "multiselect") {
      return ensureArray(attributeValue);
    }
    return attributeValue;
  },
};

function getAttributesData({
  attributesData,
  attributesQueryValue,
}: {
  attributesData: Record<
    string,
    {
      value: string | string[];
      type: Attribute["type"];
    }
  >;
  attributesQueryValue: NonNullable<LocalRoute["attributesQueryValue"]>;
}) {
  return Object.entries(attributesData).reduce((acc, [attributeId, { value, type: attributeType }]) => {
    const compatibleValueForAttributeAndFormFieldMatching = compatibleForAttributeAndFormFieldMatch(value);

    // We do this to ensure that correct jsonLogic is generated for an existing route even if the attribute's type changes
    // acc[attributeId] = attributeChangeCompatibility.ensureAttributeValueToBeOfRaqbFieldValueType({
    //   attributeValue: compatibleValueForAttributeAndFormFieldMatching,
    //   attributesQueryValue,
    //   attributeId,
    // });

    // Right now we can't trust ensureAttributeValueToBeOfRaqbFieldValueType to give us the correct value
    acc[attributeId] =
      // multiselect attribute's value must be an array as all the operators multiselect_some_in, multiselect_all_in and their respective not operators expect an array
      // If we add an operator that doesn't expect an array, we need to somehow make it operator based.
      attributeType === AttributeType.MULTI_SELECT
        ? ensureArray(compatibleValueForAttributeAndFormFieldMatching)
        : compatibleValueForAttributeAndFormFieldMatching;

    return acc;
  }, {} as Record<string, string | string[]>);
}

function getAttributesQueryValue({
  attributesQueryValue,
  attributes,
  response,
  fields,
  getFieldResponse,
}: {
  attributesQueryValue: LocalRoute["attributesQueryValue"];
  attributes: Attribute[];
  response: FormResponse;
  fields: SerializableField[] | undefined;
  getFieldResponse: GetFieldResponse;
}) {
  if (!attributesQueryValue) {
    return null;
  }

  const attributesMap = attributes.reduce((acc, attribute) => {
    acc[attribute.id] = attribute;
    return acc;
  }, {} as Record<string, Attribute>);

  const attributesQueryValueCompatibleForMatchingWithFormField: AttributesQueryValue = JSON.parse(
    replaceFieldTemplateVariableWithOptionLabel({
      queryValueString: replaceAttributeOptionIdsWithOptionLabel({
        queryValueString: JSON.stringify(attributesQueryValue),
        attributes,
      }),
      fields,
      response,
      getFieldResponse,
    })
  );

  return attributesQueryValueCompatibleForMatchingWithFormField;
}

function getAttributesQueryBuilderConfig({
  form,
  attributes,
  attributesQueryValue,
}: {
  form: Pick<SerializableForm<App_RoutingForms_Form>, "fields">;
  attributes: Attribute[];
  attributesQueryValue: NonNullable<LocalRoute["attributesQueryValue"]>;
}) {
  const attributesQueryBuilderConfig = getQueryBuilderConfigForAttributes({
    attributes,
    form,
  });

  const attributesQueryBuilderConfigFieldsWithCompatibleListValues = Object.fromEntries(
    Object.entries(attributesQueryBuilderConfig.fields).map(([raqbFieldId, raqbField]) => {
      // const raqbFieldType = attributeChangeCompatibility.getRaqbFieldTypeCompatibleWithQueryValue({
      //   attributesQueryValue,
      //   raqbField,
      //   raqbFieldId,
      // });

      // Right now we can't trust getRaqbFieldTypeCompatibleWithQueryValue to give us the correct type
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
                value: compatibleForAttributeAndFormFieldMatch(option.title),
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
  getAttributesQueryBuilderConfig,
  getAttributesQueryValue,
  getAttributesData,
};
