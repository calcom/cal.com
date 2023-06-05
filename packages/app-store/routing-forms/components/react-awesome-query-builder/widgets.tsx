import type { ChangeEvent } from "react";
import type {
  ButtonGroupProps,
  ButtonProps,
  ConjsProps,
  FieldProps,
  ProviderProps,
} from "react-awesome-query-builder";

import { Button as CalButton, SelectWithValidation as Select, TextField, TextArea } from "@calcom/ui";
import { Trash, Plus } from "@calcom/ui/components/icon";

export type CommonProps<
  TVal extends
    | string
    | boolean
    | string[]
    | {
        value: string;
        optionValue: string;
      }
> = {
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  name?: string;
  label?: string;
  value: TVal;
  setValue: (value: TVal) => void;
  /**
   * required and other validations are supported using zodResolver from react-hook-form
   */
  // required?: boolean;
};

export type SelectLikeComponentProps<
  TVal extends
    | string
    | string[]
    | {
        value: string;
        optionValue: string;
      } = string
> = {
  options: {
    label: string;
    value: TVal extends (infer P)[]
      ? P
      : TVal extends {
          value: string;
        }
      ? TVal["value"]
      : TVal;
  }[];
} & CommonProps<TVal>;

export type SelectLikeComponentPropsRAQB<TVal extends string | string[] = string> = {
  listValues: { title: string; value: TVal extends (infer P)[] ? P : TVal }[];
} & CommonProps<TVal>;

export type TextLikeComponentProps<TVal extends string | string[] | boolean = string> = CommonProps<TVal> & {
  name?: string;
};

export type TextLikeComponentPropsRAQB<TVal extends string | boolean = string> =
  TextLikeComponentProps<TVal> & {
    customProps?: object;
    type?: "text" | "number" | "email" | "tel";
    maxLength?: number;
    noLabel?: boolean;
  };

const TextAreaWidget = (props: TextLikeComponentPropsRAQB) => {
  const { value, setValue, readOnly, placeholder, maxLength, customProps, ...remainingProps } = props;

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setValue(val);
  };

  const textValue = value || "";
  return (
    <TextArea
      value={textValue}
      placeholder={placeholder}
      disabled={readOnly}
      onChange={onChange}
      maxLength={maxLength}
      {...customProps}
      {...remainingProps}
    />
  );
};

const TextWidget = (props: TextLikeComponentPropsRAQB) => {
  const {
    value,
    noLabel,
    setValue,
    readOnly,
    placeholder,
    customProps,
    type = "text",
    ...remainingProps
  } = props;
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
  };
  const textValue = value || "";
  return (
    <TextField
      containerClassName="w-full"
      type={type}
      value={textValue}
      labelSrOnly={noLabel}
      placeholder={placeholder}
      disabled={readOnly}
      onChange={onChange}
      {...remainingProps}
      {...customProps}
    />
  );
};

function NumberWidget({ value, setValue, ...remainingProps }: TextLikeComponentPropsRAQB) {
  return (
    <TextField
      type="number"
      labelSrOnly={remainingProps.noLabel}
      containerClassName="w-full"
      className="bg-default border-default disabled:bg-emphasis focus:ring-brand-default dark:focus:border-emphasis block w-full rounded-md text-sm focus:border-neutral-300 disabled:hover:cursor-not-allowed"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
      }}
      {...remainingProps}
    />
  );
}

const MultiSelectWidget = ({
  listValues,
  setValue,
  value,
  ...remainingProps
}: SelectLikeComponentPropsRAQB<string[]>) => {
  //TODO: Use Select here.
  //TODO: Let's set listValue itself as label and value instead of using title.
  if (!listValues) {
    return null;
  }
  const selectItems = listValues.map((item) => {
    return {
      label: item.title,
      value: item.value,
    };
  });

  const optionsFromList = selectItems.filter((item) => value?.includes(item.value));

  return (
    <Select
      className="mb-2"
      onChange={(items) => {
        setValue(items?.map((item) => item.value));
      }}
      value={optionsFromList}
      isMulti={true}
      isDisabled={remainingProps.readOnly}
      options={selectItems}
      {...remainingProps}
    />
  );
};

function SelectWidget({ listValues, setValue, value, ...remainingProps }: SelectLikeComponentPropsRAQB) {
  if (!listValues) {
    return null;
  }
  const selectItems = listValues.map((item) => {
    return {
      label: item.title,
      value: item.value,
    };
  });
  const optionFromList = selectItems.find((item) => item.value === value);

  return (
    <Select
      className="data-testid-select mb-2"
      onChange={(item) => {
        if (!item) {
          return;
        }
        setValue(item.value);
      }}
      isDisabled={remainingProps.readOnly}
      value={optionFromList}
      options={selectItems}
      {...remainingProps}
    />
  );
}

function Button({ config, type, label, onClick, readonly }: ButtonProps) {
  if (type === "delRule" || type == "delGroup") {
    return (
      <button className="ml-5">
        <Trash className="text-subtle m-0 h-4 w-4" onClick={onClick} />
      </button>
    );
  }
  let dataTestId = "";
  if (type === "addRule") {
    label = config?.operators.__calReporting ? "Add Filter" : "Add rule";
    dataTestId = "add-rule";
  } else if (type == "addGroup") {
    label = "Add rule group";
    dataTestId = "add-rule-group";
  }
  return (
    <CalButton
      StartIcon={Plus}
      data-testid={dataTestId}
      type="button"
      color="secondary"
      disabled={readonly}
      onClick={onClick}>
      {label}
    </CalButton>
  );
}

function ButtonGroup({ children }: ButtonGroupProps) {
  if (!(children instanceof Array)) {
    return null;
  }
  return (
    <>
      {children.map((button, key) => {
        if (!button) {
          return null;
        }
        return (
          <div key={key} className="mb-2">
            {button}
          </div>
        );
      })}
    </>
  );
}

function Conjs({ not, setNot, config, conjunctionOptions, setConjunction, disabled }: ConjsProps) {
  if (!config || !conjunctionOptions) {
    return null;
  }
  const conjsCount = Object.keys(conjunctionOptions).length;

  const lessThenTwo = disabled;
  const { forceShowConj } = config.settings;
  const showConj = forceShowConj || (conjsCount > 1 && !lessThenTwo);
  const options = [
    { label: "All", value: "all" },
    { label: "Any", value: "any" },
    { label: "None", value: "none" },
  ];
  const renderOptions = () => {
    const { checked: andSelected } = conjunctionOptions["AND"];
    const { checked: orSelected } = conjunctionOptions["OR"];
    const notSelected = not;
    // Default to All
    let value = andSelected ? "all" : orSelected ? "any" : "all";

    if (notSelected) {
      // not of All -> None
      // not of Any -> All
      value = value == "any" ? "none" : "all";
    }
    const selectValue = options.find((option) => option.value === value);
    const summary = !config.operators.__calReporting ? "Rule group when" : "Query where";
    return (
      <div className="flex items-center text-sm">
        <span>{summary}</span>
        <Select
          className="flex px-2"
          defaultValue={selectValue}
          options={options}
          onChange={(option) => {
            if (!option) return;
            if (option.value === "all") {
              setConjunction("AND");
              setNot(false);
            } else if (option.value === "any") {
              setConjunction("OR");
              setNot(false);
            } else if (option.value === "none") {
              setConjunction("OR");
              setNot(true);
            }
          }}
        />
        <span>match</span>
      </div>
    );
  };

  return showConj ? renderOptions() : null;
}

const FieldSelect = function FieldSelect(props: FieldProps) {
  const { items, setField, selectedKey } = props;
  const selectItems = items.map((item) => {
    return {
      ...item,
      value: item.key,
    };
  });

  const defaultValue = selectItems.find((item) => {
    return item.value === selectedKey;
  });

  return (
    <Select
      className="data-testid-field-select  mb-2"
      menuPosition="fixed"
      onChange={(item) => {
        if (!item) {
          return;
        }
        setField(item.value);
      }}
      defaultValue={defaultValue}
      options={selectItems}
    />
  );
};

const Provider = ({ children }: ProviderProps) => children;

const widgets = {
  TextWidget,
  TextAreaWidget,
  SelectWidget,
  NumberWidget,
  MultiSelectWidget,
  FieldSelect,
  Button,
  ButtonGroup,
  Conjs,
  Provider,
};

export default widgets;
