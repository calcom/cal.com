import { ChangeEvent } from "react";
import {
  ButtonGroupProps,
  ButtonProps,
  ConjsProps,
  FieldProps,
  NumberWidgetProps,
  ProviderProps,
  SelectWidgetProps,
  TextWidgetProps,
} from "react-awesome-query-builder";

import { Button as CalButton, SelectWithValidation as Select, TextArea, TextField } from "@calcom/ui";
import { FiTrash, FiPlus } from "@calcom/ui/components/icon";

// import { mapListValues } from "../../../../utils/stuff";

const TextAreaWidget = (props: TextWidgetProps) => {
  const { value, setValue, readonly, placeholder, maxLength, customProps, ...remainingProps } = props;

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setValue(val);
  };

  const textValue = value || "";
  return (
    <TextArea
      value={textValue}
      placeholder={placeholder}
      disabled={readonly}
      onChange={onChange}
      maxLength={maxLength}
      className="dark:border-darkgray-300 flex flex-grow border-gray-300 text-sm dark:bg-transparent dark:text-white dark:selection:bg-green-500 disabled:dark:text-gray-500"
      {...customProps}
      {...remainingProps}
    />
  );
};

const TextWidget = (props: TextWidgetProps & { type?: string }) => {
  const { value, setValue, readonly, placeholder, customProps, ...remainingProps } = props;
  let { type } = props;
  type = type || "text";
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
  };
  const textValue = value || "";
  return (
    <TextField
      containerClassName="w-full"
      type={type}
      className="dark:border-darkgray-300 flex flex-grow border-gray-300 text-sm dark:bg-transparent dark:text-white dark:selection:bg-green-500 disabled:dark:text-gray-500"
      value={textValue}
      placeholder={placeholder}
      disabled={readonly}
      onChange={onChange}
      {...remainingProps}
      {...customProps}
    />
  );
};

function NumberWidget({ value, setValue, ...remainingProps }: NumberWidgetProps) {
  return (
    <TextField
      type="number"
      containerClassName="w-full"
      className="dark:border-darkgray-300 mt-0 border-gray-300 text-sm dark:bg-transparent dark:text-white dark:selection:bg-green-500 disabled:dark:text-gray-500"
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
}: Omit<SelectWidgetProps, "value"> & {
  listValues: { title: string; value: string }[];
  value?: string[];
}) => {
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

  const defaultValue = selectItems.filter((item) => value?.includes(item.value));

  return (
    <Select
      className="dark:border-darkgray-300 mb-2 block w-full min-w-0 flex-1 rounded-none rounded-r-sm border-gray-300 dark:bg-transparent dark:text-white dark:selection:bg-green-500 disabled:dark:text-gray-500 sm:text-sm"
      onChange={(items) => {
        setValue(items?.map((item) => item.value));
      }}
      defaultValue={defaultValue}
      isMulti={true}
      options={selectItems}
      {...remainingProps}
    />
  );
};

function SelectWidget({
  listValues,
  setValue,
  value,
  ...remainingProps
}: SelectWidgetProps & {
  listValues: { title: string; value: string }[];
}) {
  if (!listValues) {
    return null;
  }
  const selectItems = listValues.map((item) => {
    return {
      label: item.title,
      value: item.value,
    };
  });
  const defaultValue = selectItems.find((item) => item.value === value);

  return (
    <Select
      className="data-testid-select dark:border-darkgray-300 mb-2 block w-full min-w-0 flex-1 rounded-none rounded-r-sm border-gray-300 dark:bg-transparent dark:text-white dark:selection:bg-green-500 disabled:dark:text-gray-500 sm:text-sm"
      onChange={(item) => {
        if (!item) {
          return;
        }
        setValue(item.value);
      }}
      defaultValue={defaultValue}
      options={selectItems}
      {...remainingProps}
    />
  );
}

function Button({ config, type, label, onClick, readonly }: ButtonProps) {
  if (type === "delRule" || type == "delGroup") {
    return (
      <button className="ml-5">
        <FiTrash className="m-0 h-4 w-4 text-gray-500" onClick={onClick} />
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
      StartIcon={FiPlus}
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
