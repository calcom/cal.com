import type { ChangeEvent } from "react";
import type {
  Settings,
  Widgets,
  SelectWidgetProps,
  SelectWidget as SelectWidgetType,
} from "react-awesome-query-builder";

import { EmailField as EmailWidget } from "@calcom/ui";

import widgetsComponents from "../widgets";
// Figure out why routing-forms/env.d.ts doesn't work
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import type { Operators, Types } from "./BasicConfig";
import BasicConfig from "./BasicConfig";

const enum ConfigFor {
  FormFields = "FormFields",
  Attributes = "Attributes",
}
const {
  TextWidget,
  TextAreaWidget,
  MultiSelectWidget,
  SelectWidget,
  NumberWidget,
  FieldSelect,
  Conjs,
  Button,
  ButtonGroup,
  Provider,
} = widgetsComponents;

const renderComponent = function <T1>(props: T1 | undefined, Component: React.FC<T1>) {
  if (!props) {
    return <div />;
  }
  return <Component {...props} />;
};

function getSettings(_configFor: ConfigFor) {
  const settings: Settings = {
    ...BasicConfig.settings,

    renderField: (props) => renderComponent(props, FieldSelect),
    renderOperator: (props) => renderComponent(props, FieldSelect),
    renderFunc: (props) => renderComponent(props, FieldSelect),
    renderConjs: (props) => renderComponent(props, Conjs),
    renderButton: (props) => renderComponent(props, Button),
    renderButtonGroup: (props) => renderComponent(props, ButtonGroup),
    renderProvider: (props) => renderComponent(props, Provider),

    groupActionsPosition: "bottomCenter",
    // TODO: Test it and then enable it. It might allow us to show better error messages.
    // But it doesn't detect every kind of error like an operator gone missing e.g. what happened in https://github.com/calcom/cal.com/pull/17102
    showErrorMessage: true,
    // Disable groups
    maxNesting: 1,
  };
  return settings;
}

// react-query-builder types have missing type property on Widget
//TODO: Reuse FormBuilder Components - FormBuilder components are built considering Cal.com design system and coding guidelines. But when awesome-query-builder renders these components, it passes its own props which are different from what our Components expect.
// So, a mapper should be written here that maps the props provided by awesome-query-builder to the props that our components expect.
function getWidgets(_configFor: ConfigFor) {
  const widgets: Widgets & { [key in keyof Widgets]: Widgets[key] & { type: string } } = {
    ...BasicConfig.widgets,
    text: {
      ...BasicConfig.widgets.text,
      factory: (props) => renderComponent(props, TextWidget),
    },
    textarea: {
      ...BasicConfig.widgets.textarea,
      factory: (props) => renderComponent(props, TextAreaWidget),
    },
    number: {
      ...BasicConfig.widgets.number,
      factory: (props) => renderComponent(props, NumberWidget),
    },
    multiselect: {
      ...BasicConfig.widgets.multiselect,
      factory: (
        props?: SelectWidgetProps & {
          listValues: { title: string; value: string }[];
        }
      ) => renderComponent(props, MultiSelectWidget),
    } as SelectWidgetType,
    select: {
      ...BasicConfig.widgets.select,
      factory: (
        props: SelectWidgetProps & {
          listValues: { title: string; value: string }[];
        }
      ) => renderComponent(props, SelectWidget),
    } as SelectWidgetType,
    phone: {
      ...BasicConfig.widgets.text,
      factory: (props) => {
        if (!props) {
          return <div />;
        }
        return <TextWidget type="tel" {...props} />;
      },
      valuePlaceholder: "Enter Phone Number",
    },
    email: {
      ...BasicConfig.widgets.text,
      factory: (props) => {
        if (!props) {
          return <div />;
        }

        return (
          <EmailWidget
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value;
              props.setValue(val);
            }}
            containerClassName="w-full"
            className="dark:placeholder:text-darkgray-600 focus:border-brand border-subtle dark:text-darkgray-900 block w-full rounded-md border-gray-300 text-sm focus:ring-black disabled:bg-gray-200 disabled:hover:cursor-not-allowed dark:bg-transparent dark:selection:bg-green-500 disabled:dark:text-gray-500"
            {...props}
          />
        );
      },
    },
  };
  return widgets;
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

function getOperators(configFor: ConfigFor) {
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
  settings: getSettings(ConfigFor.FormFields),
};

export const AttributesBaseConfig = {
  conjunctions: getConjunctions(ConfigFor.Attributes),
  operators: getOperators(ConfigFor.Attributes),
  types: getTypes(ConfigFor.Attributes),
  widgets: getWidgets(ConfigFor.Attributes),
  settings: getSettings(ConfigFor.Attributes),
};
