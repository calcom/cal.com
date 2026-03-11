import type { ChangeEvent } from "react";
import type {
  Settings,
  SelectWidgetProps,
  SelectWidget as SelectWidgetType,
  WidgetProps,
} from "react-awesome-query-builder";

import { EmailField as EmailWidget } from "@calcom/ui/components/form";

import widgetsComponents from "../widgets";
import type { Widgets, WidgetsWithoutFactory } from "./types";
import type { ConfigFor } from "./types";

export { ConfigFor } from "./types";

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

const AddressFactory = (props: WidgetProps | undefined) => {
  if (!props) return <div />;
  return <TextWidget placeholder="Enter address" {...props} />;
};

const UrlFactory = (props: WidgetProps | undefined) => {
  if (!props) return <div />;
  return <TextWidget type="url" placeholder="https://..." {...props} />;
};

const MultiEmailFactory = (props: WidgetProps | undefined) => {
  if (!props) return <div />;
  return <TextWidget placeholder="Enter email(s), comma-separated" {...props} />;
};

const BooleanFactory = (props: WidgetProps | undefined) => {
  if (!props) return <div />;
  return <TextWidget placeholder="true or false" {...props} />;
};

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
    address: {
      ...widgets.text,
      factory: AddressFactory,
    },
    url: {
      ...widgets.text,
      factory: UrlFactory,
    },
    multiemail: {
      ...widgets.text,
      factory: MultiEmailFactory,
    },
    boolean: {
      ...widgets.text,
      factory: BooleanFactory,
    },
    checkbox: {
      ...widgets.multiselect,
      factory: MultiSelectFactory,
    } as SelectWidgetType,
    radio: {
      ...widgets.select,
      factory: SelectFactory,
    } as SelectWidgetType,
  };
  return widgetsWithFactory;
}

const sharedSettingsProps: Partial<Settings> = {
  renderField: (props) => renderComponent(props, FieldSelect),
  renderOperator: (props) => renderComponent(props, FieldSelect),
  renderFunc: (props) => renderComponent(props, FieldSelect),
  renderConjs: (props) => renderComponent(props, Conjs),
  renderButton: (props) => renderComponent(props, Button),
  renderButtonGroup: (props) => renderComponent(props, ButtonGroup),
  renderProvider: (props) => renderComponent(props, Provider),
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
