import { useEffect } from "react";
import type { z } from "zod";

import Widgets from "@calcom/app-store/routing-forms/components/react-awesome-query-builder/widgets";
import type {
  TextLikeComponentProps,
  SelectLikeComponentProps,
} from "@calcom/app-store/routing-forms/components/react-awesome-query-builder/widgets";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { BookingFieldType } from "@calcom/prisma/zod-utils";
import { PhoneInput, AddressInput, Button, Label, Group, RadioField, EmailField, Tooltip } from "@calcom/ui";
import { FiUserPlus, FiX } from "@calcom/ui/components/icon";

import { ComponentForField } from "./FormBuilder";
import type { fieldsSchema } from "./FormBuilderFieldsSchema";

type Component =
  | {
      propsType: "text";
      factory: <TProps extends TextLikeComponentProps>(props: TProps) => JSX.Element;
    }
  | {
      propsType: "textList";
      factory: <TProps extends TextLikeComponentProps<string[]>>(props: TProps) => JSX.Element;
    }
  | {
      propsType: "select";
      factory: <TProps extends SelectLikeComponentProps>(props: TProps) => JSX.Element;
    }
  | {
      propsType: "boolean";
      factory: <TProps extends TextLikeComponentProps<boolean>>(props: TProps) => JSX.Element;
    }
  | {
      propsType: "multiselect";
      factory: <TProps extends SelectLikeComponentProps<string[]>>(props: TProps) => JSX.Element;
    }
  | {
      // Objective type question with option having a possible input
      propsType: "objectiveWithInput";
      factory: <
        TProps extends SelectLikeComponentProps<{
          value: string;
          optionValue: string;
        }> & {
          optionsInputs: NonNullable<z.infer<typeof fieldsSchema>[number]["optionsInputs"]>;
          value: { value: string; optionValue: string };
        } & {
          name?: string;
          required?: boolean;
        }
      >(
        props: TProps
      ) => JSX.Element;
    };

// TODO: Share FormBuilder components across react-query-awesome-builder(for Routing Forms) widgets.
// There are certain differences b/w two. Routing Forms expect label to be provided by the widget itself and FormBuilder adds label itself and expect no label to be added by component.
// Routing Form approach is better as it provides more flexibility to show the label in complex components. But that can't be done right now because labels are missing consistent asterisk required support across different components
export const Components: Record<BookingFieldType, Component> = {
  text: {
    propsType: "text",
    factory: (props) => <Widgets.TextWidget noLabel={true} {...props} />,
  },
  textarea: {
    propsType: "text",
    // TODO: Make rows configurable in the form builder
    factory: (props) => <Widgets.TextAreaWidget rows={3} {...props} />,
  },
  number: {
    propsType: "text",
    factory: (props) => <Widgets.NumberWidget noLabel={true} {...props} />,
  },
  name: {
    propsType: "text",
    // Keep special "name" type field and later build split(FirstName and LastName) variant of it.
    factory: (props) => <Widgets.TextWidget noLabel={true} {...props} />,
  },
  phone: {
    propsType: "text",
    factory: ({ setValue, readOnly, ...props }) => {
      if (!props) {
        return <div />;
      }

      return (
        <PhoneInput
          disabled={readOnly}
          onChange={(val: string) => {
            setValue(val);
          }}
          {...props}
        />
      );
    },
  },
  email: {
    propsType: "text",
    factory: (props) => {
      if (!props) {
        return <div />;
      }
      return <Widgets.TextWidget type="email" noLabel={true} {...props} />;
    },
  },
  address: {
    propsType: "text",
    factory: (props) => {
      return (
        <AddressInput
          onChange={(val) => {
            props.setValue(val);
          }}
          {...props}
        />
      );
    },
  },
  multiemail: {
    propsType: "textList",
    //TODO: Make it a ui component
    factory: function MultiEmail({ value, readOnly, label, setValue, ...props }) {
      const placeholder = props.placeholder;
      const { t } = useLocale();
      value = value || [];
      const inputClassName =
        "dark:placeholder:text-darkgray-600 focus:border-brand-default border-subtle  block w-full rounded-md border-default text-sm focus:ring-black disabled:bg-emphasis disabled:hover:cursor-not-allowed dark:bg-transparent dark:selection:bg-green-500 disabled:dark:text-subtle";
      return (
        <>
          {value.length ? (
            <div>
              <label htmlFor="guests" className="text-default  mb-1 block text-sm font-medium">
                {label}
              </label>
              <ul>
                {value.map((field, index) => (
                  <li key={index}>
                    <EmailField
                      disabled={readOnly}
                      value={value[index]}
                      onChange={(e) => {
                        value[index] = e.target.value;
                        setValue(value);
                      }}
                      className={classNames(inputClassName, "border-r-0")}
                      addOnClassname={classNames(
                        "border-default border block border-l-0 disabled:bg-emphasis disabled:hover:cursor-not-allowed bg-transparent disabled:text-subtle border-subtle "
                      )}
                      placeholder={placeholder}
                      label={<></>}
                      required
                      addOnSuffix={
                        !readOnly ? (
                          <Tooltip content="Remove email">
                            <button
                              className="m-1 disabled:hover:cursor-not-allowed"
                              type="button"
                              onClick={() => {
                                value.splice(index, 1);
                                setValue(value);
                              }}>
                              <FiX className="text-default" />
                            </button>
                          </Tooltip>
                        ) : null
                      }
                    />
                  </li>
                ))}
              </ul>
              {!readOnly && (
                <Button
                  data-testid="add-another-guest"
                  type="button"
                  color="minimal"
                  StartIcon={FiUserPlus}
                  className="my-2.5"
                  onClick={() => {
                    value.push("");
                    setValue(value);
                  }}>
                  {t("add_another")}
                </Button>
              )}
            </div>
          ) : (
            <></>
          )}

          {!value.length && !readOnly && (
            <Button
              data-testid="add-guests"
              color="minimal"
              variant="button"
              StartIcon={FiUserPlus}
              onClick={() => {
                value.push("");
                setValue(value);
              }}
              className="mr-auto">
              {label}
            </Button>
          )}
        </>
      );
    },
  },
  multiselect: {
    propsType: "multiselect",
    factory: (props) => {
      const newProps = {
        ...props,
        listValues: props.options.map((o) => ({ title: o.label, value: o.value })),
      };
      return <Widgets.MultiSelectWidget {...newProps} />;
    },
  },
  select: {
    propsType: "select",
    factory: (props) => {
      const newProps = {
        ...props,
        listValues: props.options.map((o) => ({ title: o.label, value: o.value })),
      };
      return <Widgets.SelectWidget {...newProps} />;
    },
  },
  checkbox: {
    propsType: "multiselect",
    factory: ({ options, readOnly, setValue, value }) => {
      value = value || [];
      return (
        <div>
          {options.map((option, i) => {
            return (
              <label key={i} className="block">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  onChange={(e) => {
                    const newValue = value.filter((v) => v !== option.value);
                    if (e.target.checked) {
                      newValue.push(option.value);
                    }
                    setValue(newValue);
                  }}
                  className="dark:bg-darkgray-300 border-subtle border-default text-emphasis h-4 w-4 rounded focus:ring-black ltr:mr-2 rtl:ml-2"
                  value={option.value}
                  checked={value.includes(option.value)}
                />
                <span className="dark:text-inverted ms-2 me-2 text-sm">{option.label ?? ""}</span>
              </label>
            );
          })}
        </div>
      );
    },
  },
  radio: {
    propsType: "select",
    factory: ({ setValue, value, options }) => {
      return (
        <Group
          value={value}
          onValueChange={(e) => {
            setValue(e);
          }}>
          <>
            {options.map((option, i) => (
              <RadioField
                label={option.label}
                key={`option.${i}.radio`}
                value={option.label}
                id={`option.${i}.radio`}
              />
            ))}
          </>
        </Group>
      );
    },
  },
  radioInput: {
    propsType: "objectiveWithInput",
    factory: function RadioInputWithLabel({ name, options, optionsInputs, value, setValue, readOnly }) {
      useEffect(() => {
        if (!value) {
          setValue({
            value: options[0]?.value,
            optionValue: "",
          });
        }
      }, [options, setValue, value]);

      return (
        <div>
          <div>
            <div className="mb-2">
              {options.length > 1 ? (
                options.map((option, i) => {
                  return (
                    <label key={i} className="block">
                      <input
                        type="radio"
                        disabled={readOnly}
                        name={name}
                        className="dark:bg-darkgray-300 border-subtle border-default text-emphasis h-4 w-4 focus:ring-black ltr:mr-2 rtl:ml-2"
                        value={option.value}
                        onChange={(e) => {
                          setValue({
                            value: e.target.value,
                            optionValue: "",
                          });
                        }}
                        checked={value?.value === option.value}
                      />
                      <span className="text-emphasis ms-2 me-2 text-sm">{option.label ?? ""}</span>
                    </label>
                  );
                })
              ) : (
                // Show option itself as label because there is just one option
                <>
                  <Label>
                    {options[0].label}
                    {!readOnly && optionsInputs[options[0].value]?.required ? (
                      <span className="text-default ml-1 mb-1 text-sm font-medium">*</span>
                    ) : null}
                  </Label>
                </>
              )}
            </div>
          </div>
          {(() => {
            const optionField = optionsInputs[value?.value];
            if (!optionField) {
              return null;
            }
            return (
              <div>
                <ComponentForField
                  readOnly={!!readOnly}
                  field={{
                    ...optionField,
                    name: "optionField",
                  }}
                  value={value?.optionValue}
                  setValue={(val: string | undefined) => {
                    setValue({
                      value: value?.value,
                      optionValue: val || "",
                    });
                  }}
                />
              </div>
            );
          })()}
        </div>
      );
    },
  },
  boolean: {
    propsType: "boolean",
    factory: ({ readOnly, label, value, setValue }) => {
      return (
        <div className="flex">
          <input
            type="checkbox"
            onChange={(e) => {
              if (e.target.checked) {
                setValue(true);
              } else {
                setValue(false);
              }
            }}
            className="border-default disabled:bg-emphasis disabled:dark:text-subtle text-emphasis h-4 w-4 rounded focus:ring-black ltr:mr-2 rtl:ml-2"
            placeholder=""
            checked={value}
            disabled={readOnly}
          />
          <Label className="text-default dark:text-inverted -mt-px block text-sm font-medium">{label}</Label>
        </div>
      );
    },
  },
} as const;
// Should use `statisfies` to check if the `type` is from supported types. But satisfies doesn't work with Next.js config
