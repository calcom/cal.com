"use client";

import dynamic from "next/dynamic";
import type { ChangeEvent } from "react";
import type {
  ButtonGroupProps,
  ButtonProps,
  ConjsProps,
  FieldProps,
  ProviderProps,
} from "react-awesome-query-builder";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button as CalButton } from "@calcom/ui/components/button";
import { TextArea } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

const Select = dynamic(
  async () => (await import("@calcom/ui/components/form")).SelectWithValidation
) as unknown as typeof import("@calcom/ui/components/form").SelectWithValidation;

export type CommonProps<
  TVal extends
    | string
    | boolean
    | string[]
    | {
        value: string;
        optionValue: string;
      },
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
      } = string,
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
    type?: "text" | "number" | "email" | "tel" | "url";
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
      className="mb-2"
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
      size="sm"
      containerClassName="w-full mb-2"
      type={type}
      value={textValue}
      noLabel={noLabel}
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
      size="sm"
      type="number"
      labelSrOnly={remainingProps.noLabel}
      containerClassName="w-full"
      className="mb-2"
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

  // If no value could be found in the list, then we set the value to undefined.
  // This is to update the value back to the source that we couldn't set it. This is important otherwise the outside party thinks that the value is set but it is not.
  // Do it only when it is not already empty, this is to avoid infinite state updates
  // NOTE: value is some times sent as undefined even though the type will tell you that it can't be
  if (optionsFromList.length === 0 && value?.length) {
    setValue([]);
  }

  return (
    <Select
      size="sm"
      aria-label="multi-select-dropdown"
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

  // If the value is not in the list, then we set the value to undefined.
  // This is to update the value back to the source that we couldn't set it. This is important otherwise the outside party thinks that the value is set but it is not.
  // Do it only when it is not already empty string, this is to avoid infinite state updates
  if (!optionFromList && value) {
    setValue("");
  }

  return (
    <Select
      size="sm"
      aria-label="select-dropdown"
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
  const { t } = useLocale();
  if (type === "delRule" || type == "delGroup") {
    return (
      <button className="ml-5">
        <Icon name="trash" className="text-subtle m-0 h-4 w-4" onClick={onClick} />
      </button>
    );
  }
  let dataTestId = "";
  if (type === "addRule") {
    label = config?.operators.__calReporting ? t("add_filter") : t("add_rule");
    dataTestId = "add-rule";
  } else if (type == "addGroup") {
    label = t("add_rule_group");
    dataTestId = "add-rule-group";
  }
  return (
    <CalButton
      size="sm"
      StartIcon="plus"
      data-testid={dataTestId}
      type="button"
      color="minimal"
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
        return <div key={key}>{button}</div>;
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
    const summary = !config.operators.__calReporting ? "If booker selects" : "Query where";
    return (
      <div className="mb-px flex items-center text-sm">
        <span>{summary}</span>
        <Select
          className="flex px-2"
          size="sm"
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
        {/* <span>match</span> */}
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
      size="sm"
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
