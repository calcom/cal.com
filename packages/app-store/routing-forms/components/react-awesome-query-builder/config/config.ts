// Figure out why routing-forms/env.d.ts doesn't work
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import type { Operators, Types } from "./BasicConfig";
import BasicConfig from "./BasicConfig";
import { ConfigFor } from "./types";
import type { WidgetsWithoutFactory } from "./types";

function getWidgets(_configFor: ConfigFor) {
  const widgetsWithoutFactory: WidgetsWithoutFactory = {
    ...BasicConfig.widgets,
    phone: {
      ...BasicConfig.widgets.text,
    },
    email: {
      ...BasicConfig.widgets.text,
    },
  };
  return widgetsWithoutFactory;
}

function getTypes(configFor: ConfigFor) {
  const multiSelectOperators = BasicConfig.types.multiselect.widgets.multiselect.operators || [];

  if (configFor === ConfigFor.Attributes) {
    // Attributes don't need reporting at the moment. So, we can support multiselect_some_in and multiselect_not_some_in operators for attributes.
    // We could probably use them in FormFields later once they are supported through Prisma query as well
    multiSelectOperators.push("multiselect_some_in", "multiselect_not_some_in");
  }

  const types: Types = {
    ...BasicConfig.types,
    phone: {
      ...BasicConfig.types.text,
      widgets: {
        ...BasicConfig.types.text.widgets,
      },
    },
    email: {
      ...BasicConfig.types.text,
      widgets: {
        ...BasicConfig.types.text.widgets,
      },
    },
    multiselect: {
      ...BasicConfig.types.multiselect,
      widgets: {
        ...BasicConfig.types.multiselect.widgets,
        multiselect: {
          ...BasicConfig.types.multiselect.widgets.multiselect,
          operators: [...multiSelectOperators],
        },
      },
    },
  };
  return types;
}

function getOperators(_configFor: ConfigFor) {
  // Clone to avoid mutating the original object
  const operators: Operators = {
    ...BasicConfig.operators,
  };

  return operators;
}

function getConjunctions(_configFor: ConfigFor) {
  return {
    ...BasicConfig.conjunctions,
  };
}

export const FormFieldsBaseConfig = {
  conjunctions: getConjunctions(ConfigFor.FormFields),
  operators: getOperators(ConfigFor.FormFields),
  types: getTypes(ConfigFor.FormFields),
  widgets: getWidgets(ConfigFor.FormFields),
};

export const AttributesBaseConfig = {
  conjunctions: getConjunctions(ConfigFor.Attributes),
  operators: getOperators(ConfigFor.Attributes),
  types: getTypes(ConfigFor.Attributes),
  widgets: getWidgets(ConfigFor.Attributes),
};
