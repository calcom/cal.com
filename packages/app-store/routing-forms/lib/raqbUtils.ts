import type { App_RoutingForms_Form } from "@prisma/client";
import type { JsonGroup, JsonItem, JsonRule, JsonTree } from "react-awesome-query-builder";
import type { ImmutableTree, BuilderProps, Config } from "react-awesome-query-builder";
import { Query, Builder, Utils as QbUtils } from "react-awesome-query-builder";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { AttributeType } from "@calcom/prisma/enums";

import type { Attribute, AttributesQueryValue } from "../types/types";
import type { LocalRoute } from "../types/types";
import type { FormResponse, SerializableForm } from "../types/types";
import type { SerializableField } from "../types/types";
import type { AttributesQueryBuilderConfigWithRaqbFields } from "./getQueryBuilderConfig";
import { getQueryBuilderConfigForAttributes } from "./getQueryBuilderConfig";
import { AdditionalSelectOptions, AdditionalSelectOptionsResponse } from "@calcom/lib/raqb/types";

const moduleLogger = logger.getSubLogger({ prefix: ["routing-forms/lib/raqbUtils"] });

function getFieldResponse({
  field,
  fieldResponseValue,
}: {
  fieldResponseValue: AdditionalSelectOptionsResponse[keyof AdditionalSelectOptionsResponse]["value"];
  field: {
    type: "select" | "multiselect";
    options: {
      id: string;
      label: string;
    }[];
  };
}) {
  // if (!isOptionsField(field)) {
  //   return {
  //     value: fieldResponseValue,
  //     response: fieldResponseValue,
  //   };
  // }

  // if (!field.options) {
  //   return {
  //     value: fieldResponseValue,
  //     response: fieldResponseValue,
  //   };
  // }

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
  return {
    // value is a legacy prop that is just sending the labels which can change
    value: chosenOptions.map((option) => option.label),
    // response is new prop that is sending the label along with id(which doesn't change)
    response: chosenOptions,
  };
}


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
  let queryValueToUse = queryValue || buildEmptyQueryValue();
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
export const replaceAttributeOptionIdsWithOptionLabel = ({
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
    console.log('Replacing ', attributeOptionId, 'with', caseInsensitive(attributeOption.value))
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
  additionalSelectOptions,
}: {
  queryValueString: string;
  additionalSelectOptions?: AdditionalSelectOptions;
}) => {
  if (!additionalSelectOptions) {
    return queryValueString;
  }
  const { fields, response } = additionalSelectOptions;
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
    return fieldValue ? caseInsensitive(fieldValue.toString()) : match;
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
    const compatibleValueForAttributeAndFormFieldMatching = caseInsensitive(value);

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
  additionalSelectOptions,
}: {
  attributesQueryValue: LocalRoute["attributesQueryValue"];
  attributes: Attribute[];
  additionalSelectOptions?: AdditionalSelectOptions;
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
      additionalSelectOptions,
    })
  );

  return attributesQueryValueCompatibleForMatchingWithFormField;
}

export function getAttributesQueryBuilderConfig({
  additionalSelectOptions,
  attributes,
}: {
  additionalSelectOptions?: AdditionalSelectOptions;
  attributes: Attribute[];
}) {
  const attributesQueryBuilderConfig = getQueryBuilderConfigForAttributes({
    attributes,
    fieldsAsAdditionalSelectOptions: additionalSelectOptions?.fields,
  });

  const attributesQueryBuilderConfigFieldsWithCompatibleListValues = Object.fromEntries(
    Object.entries(attributesQueryBuilderConfig.fields).map(([raqbFieldId, raqbField]) => {
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
  getAttributesQueryBuilderConfig,
  getAttributesQueryValue,
  getAttributesData,
};
