import { AttributeType } from "@calcom/prisma/enums";

import type { RoutingForm, Attribute } from "../types/types";
import {
  FieldTypes,
  RoutingFormFieldType,
  FIELD_TYPE_TO_RAQB_WIDGET_TYPE,
  isValidRoutingFormFieldType,
} from "./FieldTypes";
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

const FIELD_TYPES_NEEDING_LIST_VALUES: ReadonlySet<string> = new Set([
  RoutingFormFieldType.SINGLE_SELECT,
  RoutingFormFieldType.MULTI_SELECT,
  RoutingFormFieldType.CHECKBOX,
  RoutingFormFieldType.RADIO,
]);

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

function getRaqbWidgetType(fieldType: string): string {
  if (isValidRoutingFormFieldType(fieldType)) {
    return FIELD_TYPE_TO_RAQB_WIDGET_TYPE[fieldType];
  }
  return "text";
}

export function getQueryBuilderConfigForFormFields(form: Pick<RoutingForm, "fields">, forReporting = false) {
  const fields: RaqbConfigFields = {};
  form.fields?.forEach((field) => {
    if ("routerField" in field) {
      field = field.routerField;
    }
    const fieldType = field.type;

    const options = getUIOptionsForSelect(field);
    const widgetType = getRaqbWidgetType(fieldType);
    const needsListValues = FIELD_TYPES_NEEDING_LIST_VALUES.has(fieldType);

    fields[field.id] = {
      label: field.label,
      type: widgetType,
      valueSources: ["value"],
      fieldSettings: {
        listValues: needsListValues ? options : undefined,
      },
    };
  });

  const initialConfigCopy = {
    ...FormFieldsInitialConfig,
    operators: { ...FormFieldsInitialConfig.operators } as typeof FormFieldsInitialConfig.operators & {
      __calReporting?: boolean;
    },
  };

  if (forReporting) {
    delete initialConfigCopy.operators.is_empty;
    delete initialConfigCopy.operators.is_not_empty;
    delete initialConfigCopy.operators.between;
    delete initialConfigCopy.operators.not_between;
    initialConfigCopy.operators.__calReporting = true;
  }

  return {
    ...initialConfigCopy,
    fields,
  };
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
        value: option.id,
      })),
    };
  });
}

export function getQueryBuilderConfigForAttributes({
  attributes,
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
    const attributeType = attribute.type as (typeof FieldTypes)[number]["value"];
    if (FieldTypes.map((f) => f.value).includes(attributeType)) {
      const widget = FormFieldsInitialConfig.widgets[attributeType];
      const widgetType = widget.type;
      const valueOfFieldOptions = dynamicOperandFields.map((field) => ({
        title: `Value of field '${field.label}'`,
        value: buildDynamicOperandFieldVariable(field.id),
      }));

      const attributeOptions = [...valueOfFieldOptions, ...attribute.options];

      fields[attribute.id] = {
        label: attribute.label,
        type: widgetType,
        valueSources: ["value"],
        fieldSettings: {
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
    fields,
  };
}
