import { AttributeType } from "@calcom/prisma/enums";

import type { RoutingForm, Attribute } from "../types/types";
import { FieldTypes, isValidRoutingFormFieldType, isFieldTypeWithOptions } from "./FieldTypes";
import { AttributesInitialConfig, FormFieldsInitialConfig } from "./InitialConfig";
import { getUIOptionsForSelect } from "./selectOptions";

export const isDynamicOperandField = (value: string) => {
  return /{field:.*?}/.test(value);
};

const buildDynamicOperandFieldVariable = (fieldId: string) => {
  return `{field:${fieldId}}`;
};

type RaqbConfigFields = Record<
  string,
  {
    label: string;
    type: string;
    valueSources: ["value"];
    fieldSettings: {
      listValues?: {
        value: string;
        title: string;
      }[];
    };
  }
>;

// Map attribute types to field types for query builder
const attributeTypesMap = new Map<keyof typeof AttributeType, string>([
  [AttributeType.SINGLE_SELECT, "select"],
  [AttributeType.MULTI_SELECT, "multiselect"],
  [AttributeType.TEXT, "text"],
  [AttributeType.NUMBER, "number"],
]);

export type FormFieldsQueryBuilderConfigWithRaqbFields = ReturnType<
  typeof getQueryBuilderConfigForFormFields
>;

export type AttributesQueryBuilderConfigWithRaqbFields = ReturnType<
  typeof getQueryBuilderConfigForAttributes
>;

export function getQueryBuilderConfigForFormFields(form: Pick<RoutingForm, "fields">, forReporting = false) {
  const fields: RaqbConfigFields = {};
  form.fields?.forEach((field) => {
    if ("routerField" in field) {
      field = field.routerField;
    }
    const fieldType = field.type;
    if (isValidRoutingFormFieldType(fieldType)) {
      const options = getUIOptionsForSelect(field);

      const widget = FormFieldsInitialConfig.widgets[fieldType];
      const widgetType = widget.type;

      fields[field.id] = {
        label: field.label,
        type: widgetType,
        valueSources: ["value"],
        fieldSettings: {
          // IMPORTANT: listValues must be undefined for non-select/multiselect fields otherwise RAQB doesn't like it. It ends up considering all the text values as per the listValues too which could be empty as well making all values invalid
          listValues: isFieldTypeWithOptions(fieldType) ? options : undefined,
        },
      };
    } else {
      throw new Error(`Unsupported field type:${field.type}`);
    }
  });

  const initialConfigCopy = {
    ...FormFieldsInitialConfig,
    operators: { ...FormFieldsInitialConfig.operators } as typeof FormFieldsInitialConfig.operators & {
      __calReporting?: boolean;
    },
  };

  if (forReporting) {
    // Empty and Not empty doesn't work well with JSON querying in prisma. Try to implement these when we desperately need these operators.
    delete initialConfigCopy.operators.is_empty;
    delete initialConfigCopy.operators.is_not_empty;

    // These operators can be implemented later if needed.
    delete initialConfigCopy.operators.between;
    delete initialConfigCopy.operators.not_between;

    initialConfigCopy.operators.__calReporting = true;
  }
  // You need to provide your own config. See below 'Config format'
  const config = {
    ...initialConfigCopy,
    fields: fields,
  };
  return config;
}

function transformAttributesToCompatibleFormat(attributes: Attribute[]) {
  return attributes.map((attribute) => {
    const mappedType = attributeTypesMap.get(attribute.type);
    if (!mappedType) {
      throw new Error(`Unsupported attribute type:${attribute.type}`);
    }
    return {
      label: attribute.name,
      id: attribute.id,
      type: mappedType,
      options: attribute.options.map((option) => ({
        title: option.value,
        // We have to use something that doesn't change often. ID of attribute never changes. Changing means a saved value will become invalid
        value: option.id,
      })),
    };
  });
}

export function getQueryBuilderConfigForAttributes({
  attributes,
  /**
   * It is the fields that makes up additional options to be matched with for the single select/multiselect attributes.
   * They are shown as 'Value of field <field-label>' in the dropdown.
   */
  dynamicOperandFields = [],
}: {
  attributes: Attribute[];

  dynamicOperandFields?: {
    label: string;
    id: string;
  }[];
}) {
  const transformedAttributes = transformAttributesToCompatibleFormat(attributes);
  const fields: RaqbConfigFields = {};
  transformedAttributes.forEach((attribute) => {
    const attributeType = attribute.type;
    if (isValidRoutingFormFieldType(attributeType)) {
      const widget = FormFieldsInitialConfig.widgets[attributeType];
      const widgetType = widget.type;
      const valueOfFieldOptions = (() => {
        const formFieldsOptions = dynamicOperandFields.map((field) => ({
          title: `Value of field '${field.label}'`,
          value: buildDynamicOperandFieldVariable(field.id),
        }));
        return formFieldsOptions;
      })();

      const attributeOptions = [...valueOfFieldOptions, ...attribute.options];

      // These are RAQB fields
      fields[attribute.id] = {
        label: attribute.label,
        type: widgetType,
        valueSources: ["value"],
        fieldSettings: {
          // IMPORTANT: listValues must be undefined for non-select/multiselect fields otherwise RAQB doesn't like it. It ends up considering all the text values as per the listValues too which could be empty as well making all values invalid
          listValues: isFieldTypeWithOptions(attributeType) ? attributeOptions : undefined,
        },
      };
    } else {
      throw new Error(`Unsupported field type:${attribute.type}`);
    }
  });

  const initialConfigCopy = {
    ...AttributesInitialConfig,
    operators: { ...AttributesInitialConfig.operators },
  };
  return {
    ...initialConfigCopy,
    fields: fields,
  };
}
