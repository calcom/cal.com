import type { ChangeEvent } from "react";
import type {
  Settings,
  SelectWidgetProps,
  SelectWidget as SelectWidgetType,
  WidgetProps,
} from "react-awesome-query-builder";

import { AddressInput } from "@calcom/ui/components/address";
import { CheckboxField, EmailField as EmailWidget, Checkbox } from "@calcom/ui/components/form";
import { RadioGroup, RadioField } from "@calcom/ui/components/radio";

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
  if (!props) {
    return <div />;
  }
  return (
    <AddressInput
      onChange={(val: string) => {
        props.setValue(val);
      }}
      className="mb-2"
      {...props}
    />
  );
};

const UrlFactory = (props: WidgetProps | undefined) => {
  if (!props) {
    return <div />;
  }
  return <TextWidget type="url" autoComplete="url" {...props} />;
};

const CheckboxGroupFactory = (
  props:
    | (SelectWidgetProps & {
        listValues: { title: string; value: string }[];
      })
    | undefined
) => {
  if (!props) {
    return <div />;
  }
  const { listValues, value, setValue, readOnly } = props;
  if (!listValues) {
    return null;
  }
  const currentValue = (value as unknown as string[]) || [];
  return (
    <div className="mb-2">
      {listValues.map((option, i) => (
        <label key={i} className="block">
          <Checkbox
            disabled={readOnly}
            onCheckedChange={(checked: boolean) => {
              const newValue = currentValue.filter((v: string) => v !== option.value);
              if (checked) {
                newValue.push(option.value);
              }
              setValue(newValue as unknown as string);
            }}
            value={option.value}
            checked={currentValue.includes(option.value)}
          />
          <span className="text-emphasis me-2 ms-2 text-sm">{option.title ?? ""}</span>
        </label>
      ))}
    </div>
  );
};

const RadioGroupFactory = (
  props:
    | (SelectWidgetProps & {
        listValues: { title: string; value: string }[];
      })
    | undefined
) => {
  if (!props) {
    return <div />;
  }
  const { listValues, value, setValue, readOnly, name } = props;
  if (!listValues) {
    return null;
  }
  return (
    <div className="mb-2">
      <RadioGroup
        disabled={readOnly}
        value={value as string}
        onValueChange={(val: string) => {
          setValue(val);
        }}>
        {listValues.map((option, i) => (
          <RadioField
            key={i}
            label={option.title}
            value={option.value}
            id={`${name || "radio"}.option.${i}`}
          />
        ))}
      </RadioGroup>
    </div>
  );
};

const BooleanFactory = (props: WidgetProps | undefined) => {
  if (!props) {
    return <div />;
  }
  const { value, setValue, readOnly, name } = props;
  const boolValue = value === "true" || value === true;
  return (
    <div className="mb-2 flex">
      <CheckboxField
        name={name || "boolean"}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setValue(e.target.checked ? "true" : "false");
        }}
        placeholder=""
        checked={boolValue}
        disabled={readOnly}
        description=""
      />
    </div>
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
    address: {
      ...widgets.text,
      factory: AddressFactory,
      valuePlaceholder: "Enter Address",
    },
    url: {
      ...widgets.text,
      factory: UrlFactory,
      valuePlaceholder: "Enter URL",
    },
    checkbox: {
      ...widgets.multiselect,
      factory: CheckboxGroupFactory,
    } as SelectWidgetType,
    radio: {
      ...widgets.select,
      factory: RadioGroupFactory,
    } as SelectWidgetType,
    boolean: {
      ...widgets.select,
      factory: BooleanFactory,
    },
  };
  return widgetsWithFactory;
}

// These are components and components reference when changed causes remounting of components. So, ensure that renderField and others are defined only once
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
