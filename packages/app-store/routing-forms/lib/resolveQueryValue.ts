import type { Attribute } from "@calcom/app-store/routing-forms/types/types";
import logger from "@calcom/lib/logger";
import type {
  AttributesQueryValue,
  dynamicFieldValueOperands,
  dynamicFieldValueOperandsResponse,
} from "@calcom/lib/raqb/types";
import { caseInsensitive } from "@calcom/lib/raqb/utils";

// Type for JSON values that can be in the query
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type MinimalField = {
  type: string;
  options?: {
    id: string | null;
    label: string;
  }[];
};

type FieldResponseValue = dynamicFieldValueOperandsResponse[keyof dynamicFieldValueOperandsResponse]["value"];

const moduleLogger = logger.getSubLogger({ prefix: ["raqb/resolveQueryValue"] });

/**
 * Replace "Attribute Options' Ids" with "Attribute Options' Labels". It makes the query value compatible to be matched with 'Value of Field' operand
 */
const replaceAttributeOptionIdsWithOptionLabel = ({
  queryValue,
  attributes,
}: {
  queryValue: AttributesQueryValue;
  attributes: Attribute[];
}) => {
  const queryValueString = JSON.stringify(queryValue);
  let queryValueWithLabels = queryValueString;
  const allAttributesOptions = attributes.flatMap((attribute) => attribute.options);
  // Because all attribute option Ids are unique, we can reliably identify them along any number of attribute options of different attributes
  allAttributesOptions.forEach((attributeOption) => {
    const attributeOptionId = attributeOption.id;
    queryValueWithLabels = queryValueWithLabels.replace(
      new RegExp(`${attributeOptionId}`, "g"),
      caseInsensitive(attributeOption.value)
    );
  });
  return JSON.parse(queryValueWithLabels) as AttributesQueryValue;
};

function getFieldResponseValueAsLabel({
  field,
  fieldResponseValue,
}: {
  fieldResponseValue: FieldResponseValue;
  field: MinimalField;
}) {
  const nonNumberFieldResponseValue =
    typeof fieldResponseValue === "number" ? fieldResponseValue.toString() : fieldResponseValue;

  if (!field.options) {
    return nonNumberFieldResponseValue;
  }

  if (nonNumberFieldResponseValue instanceof Array) {
    return nonNumberFieldResponseValue.map(transformValue);
  }

  return transformValue(nonNumberFieldResponseValue);

  function transformValue(idOrLabel: string) {
    const foundOptionById = field.options?.find((option) => {
      return option.id === idOrLabel;
    });
    if (foundOptionById) {
      return foundOptionById.label;
    } else {
      return idOrLabel;
    }
  }
}

/**
 * Resolves query values by:
 * 1. Converting attribute option IDs to their lowercase labels
 * 2. Replacing field template placeholders (e.g., "{field:location}") with actual field values
 *
 * Important: When a field template resolves to an array value, the array items are flattened
 * into the parent array. For example:
 * - Input: [["{{field:location}}", "Delhi"]] where location = ["New York", "Amsterdam"]
 * - Output: [["new york", "amsterdam", "Delhi"]] (flattened into single array)
 * @param queryValue - JSON string containing RAQB query with field template placeholders like {field:fieldId}
 * @param dynamicFieldValueOperands - Optional object containing fields metadata and user's form field responses
 * @param dynamicFieldValueOperands.fields - Array of field definitions with id, type, label, etc.
 * @param dynamicFieldValueOperands.response - Object mapping field IDs to their response values
 *
 * @example
 * ```ts
 * resolveQueryValue({
 *   queryValue: {
 *   "id": "9b8ba888-0123-4456-b89a-b1984020d699",
 *   "type": "group",
 *   "children1": {
 *       "a8a89bba-89ab-4cde-b012-31984020ebaa": {
 *         "type": "rule",
 *         "id": "a8a89bba-89ab-4cde-b012-31984020ebaa",
 *         "properties": {
 *             "field": "88be6104-d350-411d-aa0f-092b2deda257",
 *             "operator": "multiselect_some_in",
 *             "value": [
 *               [
 *                 "{field:0bf77a89-2bd0-4df7-9648-758014ba3189}", // 'Value of field' is stored like this and we call it a 'field template'
 *                 "899c846d-7c02-43dc-9057-c3f8c118d41f" // A regular attribute option id
 *               ]
 *             ],
 *             "valueSrc": [
 *               "value"
 *             ],
 *             "valueError": [
 *               null
 *             ],
 *             "valueType": [
 *                 "multiselect"
 *             ]
 *         }
 *       }
 *     }
 *   },
 *   dynamicFieldValueOperands: {
 *     fields: [
 *       { id: "location", type: "MULTI_SELECT", label: "Location" }
 *     ],
 *     response: {
 *       location: { value: ["Delhi", "Mumbai"] }
 *     }
 *   }
 * })
 * // Returns: '{"value": [["delhi", "mumbai"]], "operator": "multiselect_some_in"}'
 * ```
 */
export const resolveQueryValue = ({
  queryValue,
  dynamicFieldValueOperands,
  attributes,
}: {
  queryValue: AttributesQueryValue;
  dynamicFieldValueOperands?: dynamicFieldValueOperands;
  attributes: Attribute[];
}) => {
  const queryValueWithLabels = replaceAttributeOptionIdsWithOptionLabel({
    queryValue,
    attributes,
  });

  if (!dynamicFieldValueOperands) {
    return queryValueWithLabels;
  }
  const { fields, response } = dynamicFieldValueOperands;

  const isFieldTemplate = (str: string): boolean => {
    const trimmedStr = str.trim();
    return trimmedStr.startsWith("{field:") && trimmedStr.endsWith("}");
  };

  // Extract field ID from template string
  const extractFieldId = (template: string): string | null => {
    const trimmedTemplate = template.trim();
    if (!isFieldTemplate(trimmedTemplate)) return null;
    // Remove {field: and } to get the ID
    return trimmedTemplate.slice(7, -1);
  };

  // Resolve a field ID to its actual value
  const resolveFieldId = (fieldId: string): string | string[] | null => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !response[fieldId]?.value) {
      // Maybe invalid fieldId
      return null;
    }

    const fieldResponseValue = response[fieldId].value;
    return getFieldResponseValueAsLabel({ field, fieldResponseValue });
  };

  // Process a string value that might be a field template and thus could be an array
  const processStringValue = (value: string): string | string[] => {
    const fieldId = extractFieldId(value);
    if (!fieldId) {
      // Regular non-field template string
      return value;
    }

    const resolvedValue = resolveFieldId(fieldId);
    if (!resolvedValue) {
      // We keep the field template look-alike as it is
      return value;
    }

    return caseInsensitive(resolvedValue);
  };

  // Process an array that might contain field templates. We keep it generic instead of typing it as QueryValue to handle any property where the queryValue can have a field template
  // Note: When a field template resolves to an array, its items are flattened into the parent array
  const processArray = (arr: JsonValue[]): JsonValue[] => {
    const hasFieldTemplate = arr.some((item) => typeof item === "string" && isFieldTemplate(item));

    // Short circuit if there are no field templates
    if (!hasFieldTemplate) {
      return arr.map((item) => processAnyValue(item));
    }

    const result: JsonValue[] = [];
    for (const item of arr) {
      if (typeof item === "string" && isFieldTemplate(item)) {
        const processed = processStringValue(item);
        if (Array.isArray(processed)) {
          // Flattening behavior: Array values from field templates are spread into parent array
          // Example: ["{field:location}", "Delhi"] where location = ["New York", "Amsterdam"]
          // Result: ["New York", "Amsterdam", "Delhi"] (items flattened)
          // This is intentional to merge field values at the same array level
          result.push(...processed);
        } else {
          // [{field:location}, Delhi] -> becomes [New York, Delhi]. New York was the response for the field `location`
          result.push(processed);
        }
      } else {
        result.push(processAnyValue(item));
      }
    }
    return result;
  };

  // Process any value recursively
  const processAnyValue = (value: JsonValue): JsonValue => {
    if (value instanceof Array) {
      return processArray(value);
    }

    if (typeof value === "object" && value !== null) {
      const result: { [key: string]: JsonValue } = {};
      for (const key in value) {
        result[key] = processAnyValue(value[key]);
      }
      return result;
    }

    if (typeof value === "string") {
      const processedValue = processStringValue(value);
      return processedValue;
    }

    return value;
  };

  try {
    // Even though it recursively processes the queryValue, the object(see example in `resolveQueryValue` fn signature) isn't that complex and thus the performance is not an issue
    const processed = processAnyValue(queryValueWithLabels) as AttributesQueryValue;
    return processed;
  } catch (e) {
    moduleLogger.error("Failed to resolve field templates", {
      error: e,
      queryValue: JSON.stringify(queryValueWithLabels),
      fieldsCount: fields?.length || 0,
      responseKeys: Object.keys(response || {}),
      dynamicFieldValueOperandsProvided: !!dynamicFieldValueOperands,
    });
    throw new Error(
      `Failed to resolve field templates in query value: ${e instanceof Error ? e.message : String(e)}`
    );
  }
};
