import { FieldTypes } from "../pages/form-edit/[...appPages]";
import type { QueryBuilderUpdatedConfig, RoutingForm } from "../types/types";
import { InitialConfig } from "./InitialConfig";

export function getQueryBuilderConfig(form: RoutingForm, forReporting = false) {
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
    if (FieldTypes.map((f) => f.value).includes(field.type)) {
      const optionValues = field.selectText?.trim().split("\n");
      const options = optionValues?.map((value) => {
        const title = value;
        return {
          value,
          title,
        };
      });

      const widget = InitialConfig.widgets[field.type];
      const widgetType = widget.type;

      fields[field.id] = {
        label: field.label,
        type: widgetType,
        valueSources: ["value"],
        fieldSettings: {
          listValues: options,
        },
        // preferWidgets: field.type === "textarea" ? ["textarea"] : [],
      };
    } else {
      throw new Error("Unsupported field type:" + field.type);
    }
  });

  const initialConfigCopy = { ...InitialConfig, operators: { ...InitialConfig.operators } };
  if (forReporting) {
    delete initialConfigCopy.operators.is_empty;
    delete initialConfigCopy.operators.is_not_empty;
    initialConfigCopy.operators.__calReporting = true;
  }
  // You need to provide your own config. See below 'Config format'
  const config: QueryBuilderUpdatedConfig = {
    ...initialConfigCopy,
    fields: fields,
  };
  return config;
}
