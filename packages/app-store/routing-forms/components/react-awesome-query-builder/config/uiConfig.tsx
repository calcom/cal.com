import type { ChangeEvent } from "react";
import type {
  Settings,
  SelectWidgetProps,
  SelectWidget as SelectWidgetType,
  WidgetProps,
} from "@react-awesome-query-builder/ui";

import { EmailField as EmailWidget } from "@calcom/ui/components/form";

import widgetsComponents from "../widgets";
import type { Widgets, WidgetsWithoutFactory } from "./types";
import type { ConfigFor } from "./types";

export { ConfigFor } from "./types";

const renderComponent = function <T1>(props: T1 | undefined, Component: React.FC<T1>, componentName?: string) {
  if (!props) {
    console.log(`[renderComponent] ${componentName || 'Unknown'}: props is undefined`);
    return <div />;
  }
  if (!Component) {
    console.error(`[renderComponent] ${componentName || 'Unknown'}: Component is undefined!`, { props });
    return <div />;
  }
  console.log(`[renderComponent] ${componentName || 'Unknown'}: rendering with props`, typeof Component);
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

if (!Conjs || !Button || !ButtonGroup || !Provider) {
  console.error("Missing components:", { Conjs, Button, ButtonGroup, Provider });
}

const TextFactory = (props: WidgetProps | undefined) => renderComponent(props, TextWidget);
const TextAreaFactory = (props: WidgetProps | undefined) => renderComponent(props, TextAreaWidget);
const NumberFactory = (props: WidgetProps | undefined) => renderComponent(props, NumberWidget);
const MultiSelectFactory = (
  props:
    | (SelectWidgetProps & {
        listValues: { title: string; value: string }[];
      })
    | undefined
) => renderComponent(props, MultiSelectWidget);
const SelectFactory = (
  props:
    | (SelectWidgetProps & {
        listValues: { title: string; value: string }[];
      })
    | undefined
) => renderComponent(props, SelectWidget);

const PhoneFactory = (props: WidgetProps | undefined) => {
  if (!props) {
    return <div />;
  }
  return <TextWidget type="tel" {...props} />;
};

const EmailFactory = (props: WidgetProps | undefined) => {
  if (!props) {
    return <div />;
  }

  return (
    <EmailWidget
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        props.setValue(val);
      }}
      containerClassName="w-full mb-2"
      {...props}
    />
  );
};

// react-query-builder types have missing type property on Widget
//TODO: Reuse FormBuilder Components - FormBuilder components are built considering Cal.com design system and coding guidelines. But when awesome-query-builder renders these components, it passes its own props which are different from what our Components expect.
// So, a mapper should be written here that maps the props provided by awesome-query-builder to the props that our components expect.
function withFactoryWidgets(widgets: WidgetsWithoutFactory) {
  const widgetsWithFactory: Widgets = {
    ...widgets,
    text: {
      ...widgets.text,
      factory: TextFactory,
    },
    textarea: {
      ...widgets.textarea,
      factory: TextAreaFactory,
    },
    number: {
      ...widgets.number,
      factory: NumberFactory,
    },
    multiselect: {
      ...widgets.multiselect,
      factory: MultiSelectFactory,
    } as SelectWidgetType,
    select: {
      ...widgets.select,
      factory: SelectFactory,
    } as SelectWidgetType,
    phone: {
      ...widgets.text,
      factory: PhoneFactory,
      valuePlaceholder: "Enter Phone Number",
    },
    email: {
      ...widgets.text,
      factory: EmailFactory,
    },
  };
  return widgetsWithFactory;
}

// These are components and components reference when changed causes remounting of components. So, ensure that renderField and others are defined only once
const sharedSettingsProps: Partial<Settings> = {
  renderField: (props) => renderComponent(props, FieldSelect, 'FieldSelect'),
  renderOperator: (props) => renderComponent(props, FieldSelect, 'FieldSelect(operator)'),
  renderFunc: (props) => renderComponent(props, FieldSelect, 'FieldSelect(func)'),
  renderConjs: (props) => renderComponent(props, Conjs, 'Conjs'),
  renderButton: (props) => renderComponent(props, Button, 'Button'),
  renderButtonGroup: (props) => renderComponent(props, ButtonGroup, 'ButtonGroup'),
  renderProvider: (props) => renderComponent(props, Provider, 'Provider'),
};

function withRenderFnsSettings(settings: Settings) {
  const settingsWithRenderFns: Settings = {
    ...settings,
    ...sharedSettingsProps,
  };
  return settingsWithRenderFns;
}

export function withRaqbSettingsAndWidgets<T extends { widgets: WidgetsWithoutFactory; settings: Settings }>({
  config,
}: {
  config: T;
  configFor: ConfigFor;
}) {
  const { settings, widgets, ...rest } = config;
  return {
    ...rest,
    settings: withRenderFnsSettings(settings),
    widgets: withFactoryWidgets(widgets),
  };
}
