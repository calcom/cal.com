import { AttributeType } from "@calcom/prisma/enums";

import type { RoutingForm, Attribute } from "../types/types";
import { FieldTypes, RoutingFormFieldType } from "./FieldTypes";
import { AttributesInitialConfig, FormFieldsInitialConfig } from "./InitialConfig";
import { getUIOptionsForSelect } from "./selectOptions";

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

// FIXME: Add TS Magic to ensure all types of attributes are mapped to RoutingFormFieldType
const attributeTypesMap = new Map<keyof typeof AttributeType, RoutingFormFieldType>([
  [AttributeType.SINGLE_SELECT, RoutingFormFieldType.SINGLE_SELECT],
  [AttributeType.MULTI_SELECT, RoutingFormFieldType.MULTI_SELECT],
  [AttributeType.TEXT, RoutingFormFieldType.TEXT],
  [AttributeType.NUMBER, RoutingFormFieldType.NUMBER],
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
    // We can assert the type because otherwise we throw 'Unsupported field type' error
    const fieldType = field.type as (typeof FieldTypes)[number]["value"];
    if (FieldTypes.map((f) => f.value).includes(fieldType)) {
      const options = getUIOptionsForSelect(field);

      const widget = FormFieldsInitialConfig.widgets[fieldType];
      const widgetType = widget.type;

      fields[field.id] = {
        label: field.label,
        type: widgetType,
        valueSources: ["value"],
        fieldSettings: {
          // IMPORTANT: listValues must be undefined for non-select/multiselect fields otherwise RAQB doesn't like it. It ends up considering all the text values as per the listValues too which could be empty as well making all values invalid
          listValues: fieldType === "select" || fieldType === "multiselect" ? options : undefined,
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

    // Between and Not between aren't directly supported by prisma. So, we need to update jsonLogicToPrisma to generate gte and lte query for between. It can be implemented later.
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
  form,
}: {
  attributes: Attribute[];
  form: Pick<RoutingForm, "fields">;
}) {
  const transformedAttributes = transformAttributesToCompatibleFormat(attributes);
  const fields: RaqbConfigFields = {};
  transformedAttributes.forEach((attribute) => {
    const attributeType = attribute.type as (typeof FieldTypes)[number]["value"];
    if (FieldTypes.map((f) => f.value).includes(attributeType)) {
      // We can assert the type because otherwise we throw 'Unsupported field type' error
      const widget = FormFieldsInitialConfig.widgets[attributeType];
      const widgetType = widget.type;
      const attributeOptions = attribute.options.concat(
        (() => {
          const formFields = form.fields || [];
          const formFieldsOptions = formFields.map((field) => ({
            title: `Value of field '${field.label}'`,
            value: `{field:${field.id}}`,
          }));
          return formFieldsOptions;
        })()
      );

      // These are RAQB fields
      fields[attribute.id] = {
        label: attribute.label,
        type: widgetType,
        valueSources: ["value"],
        fieldSettings: {
          // IMPORTANT: listValues must be undefined for non-select/multiselect fields otherwise RAQB doesn't like it. It ends up considering all the text values as per the listValues too which could be empty as well making all values invalid
          listValues:
            attributeType === "select" || attributeType === "multiselect" ? attributeOptions : undefined,
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
