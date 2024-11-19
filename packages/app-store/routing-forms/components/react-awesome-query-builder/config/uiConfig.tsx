import type { ChangeEvent } from "react";
import type {
  Settings,
  SelectWidgetProps,
  SelectWidget as SelectWidgetType,
} from "react-awesome-query-builder";

import { EmailField as EmailWidget } from "@calcom/ui";

import widgetsComponents from "../widgets";
import BasicConfig from "./BasicConfig";
import type { Widgets, WidgetsWithoutFactory } from "./types";
import type { ConfigFor } from "./types";

export { ConfigFor } from "./types";

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

const renderComponent = function <T1>(props: T1 | undefined, Component: React.FC<T1>) {
  if (!props) {
    return <div />;
  }
  return <Component {...props} />;
};

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
// react-query-builder types have missing type property on Widget
//TODO: Reuse FormBuilder Components - FormBuilder components are built considering Cal.com design system and coding guidelines. But when awesome-query-builder renders these components, it passes its own props which are different from what our Components expect.
// So, a mapper should be written here that maps the props provided by awesome-query-builder to the props that our components expect.
function withFactoryWidgets(widgets: WidgetsWithoutFactory) {
  const widgetsWithFactory: Widgets = {
    ...widgets,
    text: {
      ...widgets.text,
      factory: (props) => renderComponent(props, TextWidget),
    },
    textarea: {
      ...widgets.textarea,
      factory: (props) => renderComponent(props, TextAreaWidget),
    },
    number: {
      ...widgets.number,
      factory: (props) => renderComponent(props, NumberWidget),
    },
    multiselect: {
      ...widgets.multiselect,
      factory: (
        props?: SelectWidgetProps & {
          listValues: { title: string; value: string }[];
        }
      ) => renderComponent(props, MultiSelectWidget),
    } as SelectWidgetType,
    select: {
      ...widgets.select,
      factory: (
        props: SelectWidgetProps & {
          listValues: { title: string; value: string }[];
        }
      ) => renderComponent(props, SelectWidget),
    } as SelectWidgetType,
    phone: {
      ...widgets.text,
      factory: (props) => {
        if (!props) {
          return <div />;
        }
        return <TextWidget type="tel" {...props} />;
      },
      valuePlaceholder: "Enter Phone Number",
    },
    email: {
      ...widgets.text,
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
  return widgetsWithFactory;
}

export function withRaqbSettingsAndWidgets<T extends { widgets: WidgetsWithoutFactory }>({
  config,
  configFor,
}: {
  config: T;
  configFor: ConfigFor;
}) {
  return {
    ...config,
    settings: getSettings(configFor),
    widgets: withFactoryWidgets(config.widgets),
  };
}
