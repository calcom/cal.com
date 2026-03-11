// Figure out why routing-forms/env.d.ts doesn't work
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import type { Operators, Types } from "./BasicConfig";
import BasicConfig from "./BasicConfig";
import { ConfigFor } from "./types";
import type { WidgetsWithoutFactory } from "./types";

function getWidgetsWithoutFactory(_configFor: ConfigFor) {
  const widgetsWithoutFactory: WidgetsWithoutFactory = {
    ...BasicConfig.widgets,
    phone: {
      ...BasicConfig.widgets.text,
    },
    email: {
      ...BasicConfig.widgets.text,
    },
    address: {
      ...BasicConfig.widgets.text,
    },
    url: {
      ...BasicConfig.widgets.text,
    },
    multiemail: {
      ...BasicConfig.widgets.text,
    },
    boolean: {
      ...BasicConfig.widgets.text,
    },
    checkbox: {
      ...BasicConfig.widgets.multiselect,
    },
    radio: {
      ...BasicConfig.widgets.select,
    },
  };
  return widgetsWithoutFactory;
}

function getTypes(configFor: ConfigFor) {
  const multiSelectOperators = BasicConfig.types.multiselect.widgets.multiselect.operators || [];

  if (configFor === ConfigFor.Attributes) {
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
    address: {
      ...BasicConfig.types.text,
      widgets: {
        ...BasicConfig.types.text.widgets,
      },
    },
    url: {
      ...BasicConfig.types.text,
      widgets: {
        ...BasicConfig.types.text.widgets,
      },
    },
    multiemail: {
      ...BasicConfig.types.text,
      widgets: {
        ...BasicConfig.types.text.widgets,
      },
    },
    boolean: {
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
    checkbox: {
      ...BasicConfig.types.multiselect,
      widgets: {
        ...BasicConfig.types.multiselect.widgets,
        multiselect: {
          ...BasicConfig.types.multiselect.widgets.multiselect,
          operators: [...(BasicConfig.types.multiselect.widgets.multiselect.operators || [])],
        },
      },
    },
    radio: {
      ...BasicConfig.types.select,
      widgets: {
        ...BasicConfig.types.select.widgets,
      },
    },
  };
  return types;
}

function getOperators(_configFor: ConfigFor) {
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

function getSettingsWithoutRenderFns() {
  return {
    ...BasicConfig.settings,
    groupActionsPosition: "bottomCenter" as const,
    showErrorMessage: true,
    maxNesting: 1,
  };
}

export const FormFieldsBaseConfig = {
  conjunctions: getConjunctions(ConfigFor.FormFields),
  operators: getOperators(ConfigFor.FormFields),
  types: getTypes(ConfigFor.FormFields),
  widgets: getWidgetsWithoutFactory(ConfigFor.FormFields),
  settings: getSettingsWithoutRenderFns(),
};

export const AttributesBaseConfig = {
  conjunctions: getConjunctions(ConfigFor.Attributes),
  operators: getOperators(ConfigFor.Attributes),
  types: getTypes(ConfigFor.Attributes),
  widgets: getWidgetsWithoutFactory(ConfigFor.Attributes),
  settings: getSettingsWithoutRenderFns(),
};
