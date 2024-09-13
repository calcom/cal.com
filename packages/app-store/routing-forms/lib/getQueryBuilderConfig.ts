import type { QueryBuilderUpdatedConfig, RoutingForm } from "../types/types";
import { FieldTypes } from "./FieldTypes";
import { InitialConfig } from "./InitialConfig";
import { getUIOptionsForSelect } from "./selectOptions";

export function getQueryBuilderConfig(form: Pick<RoutingForm, "fields">, forReporting = false) {
  const fields: Record<
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
  > = {};
  form.fields?.forEach((field) => {
    if ("routerField" in field) {
      field = field.routerField;
    }
    // We can assert the type because otherwise we throw 'Unsupported field type' error
    const fieldType = field.type as (typeof FieldTypes)[number]["value"];
    if (FieldTypes.map((f) => f.value).includes(fieldType)) {
      const options = getUIOptionsForSelect(field);

      const widget = InitialConfig.widgets[fieldType];
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

  const initialConfigCopy = { ...InitialConfig, operators: { ...InitialConfig.operators } };
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
  const config: QueryBuilderUpdatedConfig = {
    ...initialConfigCopy,
    fields: fields,
  };
  return config;
}
