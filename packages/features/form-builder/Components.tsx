import { useEffect } from "react";
import type { z } from "zod";

import type {
  SelectLikeComponentProps,
  TextLikeComponentProps,
} from "@calcom/app-store/routing-forms/components/react-awesome-query-builder/widgets";
import Widgets from "@calcom/app-store/routing-forms/components/react-awesome-query-builder/widgets";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  AddressInput,
  Button,
  CheckboxField,
  EmailField,
  Group,
  Icon,
  InfoBadge,
  InputField,
  Label,
  PhoneInput,
  RadioField,
  Tooltip,
} from "@calcom/ui";

import { ComponentForField } from "./FormBuilderField";
import { propsTypes } from "./propsTypes";
import type { fieldSchema, FieldType, variantsConfigSchema } from "./schema";
import { preprocessNameFieldDataWithVariant } from "./utils";

export const isValidValueProp: Record<Component["propsType"], (val: unknown) => boolean> = {
  boolean: (val) => typeof val === "boolean",
  multiselect: (val) => val instanceof Array && val.every((v) => typeof v === "string"),
  objectiveWithInput: (val) => (typeof val === "object" && val !== null ? "value" in val : false),
  select: (val) => typeof val === "string",
  text: (val) => typeof val === "string",
  textList: (val) => val instanceof Array && val.every((v) => typeof v === "string"),
  variants: (val) => (typeof val === "object" && val !== null) || typeof val === "string",
};

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
          optionsInputs: NonNullable<z.infer<typeof fieldSchema>["optionsInputs"]>;
          value: { value: string; optionValue: string };
        } & {
          name?: string;
          required?: boolean;
        }
      >(
        props: TProps
      ) => JSX.Element;
    }
  | {
      propsType: "variants";
      factory: <
        TProps extends Omit<TextLikeComponentProps, "value" | "setValue"> & {
          variant: string | undefined;
          variants: z.infer<typeof variantsConfigSchema>["variants"];
          value: Record<string, string> | string | undefined;
          setValue: (value: string | Record<string, string>) => void;
        }
      >(
        props: TProps
      ) => JSX.Element;
    };

// TODO: Share FormBuilder components across react-query-awesome-builder(for Routing Forms) widgets.
// There are certain differences b/w two. Routing Forms expect label to be provided by the widget itself and FormBuilder adds label itself and expect no label to be added by component.
// Routing Form approach is better as it provides more flexibility to show the label in complex components. But that can't be done right now because labels are missing consistent asterisk required support across different components
export const Components: Record<FieldType, Component> = {
  text: {
    propsType: propsTypes.text,
    factory: (props) => <Widgets.TextWidget noLabel={true} {...props} />,
  },
  textarea: {
    propsType: propsTypes.textarea,
    // TODO: Make rows configurable in the form builder
    factory: (props) => <Widgets.TextAreaWidget rows={3} {...props} />,
  },
  number: {
    propsType: propsTypes.number,
    factory: (props) => <Widgets.NumberWidget noLabel={true} {...props} />,
  },
  name: {
    propsType: propsTypes.name,
    // Keep special "name" type field and later build split(FirstName and LastName) variant of it.
    factory: (props) => {
      const { variant: variantName = "fullName" } = props;
      const onChange = (name: string, value: string) => {
        let currentValue = props.value;
        if (typeof currentValue !== "object") {
          currentValue = {};
        }
        props.setValue({
          ...currentValue,
          [name]: value,
        });
      };

      if (!props.variants) {
        throw new Error("'variants' is required for 'name' type of field");
      }

      if (variantName !== "firstAndLastName" && variantName !== "fullName") {
        throw new Error(`Invalid variant name '${variantName}' for 'name' type of field`);
      }

      const value = preprocessNameFieldDataWithVariant(variantName, props.value);

      if (variantName === "fullName") {
        if (typeof value !== "string") {
          throw new Error("Invalid value for 'fullName' variant");
        }
        const variant = props.variants[variantName];
        const variantField = variant.fields[0];
        return (
          <InputField
            name="name"
            showAsteriskIndicator={true}
            placeholder={variantField.placeholder}
            label={variantField.label}
            containerClassName="w-full"
            readOnly={props.readOnly}
            value={value}
            required={variantField.required}
            type="text"
            onChange={(e) => {
              props.setValue(e.target.value);
            }}
          />
        );
      }

      const variant = props.variants[variantName];

      if (typeof value !== "object") {
        throw new Error("Invalid value for 'fullName' variant");
      }

      return (
        <div className="flex space-x-4">
          {variant.fields.map((variantField) => (
            <InputField
              // Because the container is flex(and thus margin is being computed towards container height), I need to explicitly ensure that margin-bottom for the input becomes 0, which is mb-2 otherwise
              className="!mb-0"
              showAsteriskIndicator={true}
              key={variantField.name}
              name={variantField.name}
              readOnly={props.readOnly}
              placeholder={variantField.placeholder}
              label={variantField.label}
              containerClassName={`w-full testid-${variantField.name}`}
              value={value[variantField.name as keyof typeof value]}
              required={variantField.required}
              type="text"
              onChange={(e) => onChange(variantField.name, e.target.value)}
            />
          ))}
        </div>
      );
    },
  },
  phone: {
    propsType: propsTypes.phone,
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
    propsType: propsTypes.email,
    factory: (props) => {
      if (!props) {
        return <div />;
      }
      return <Widgets.TextWidget type="email" noLabel={true} {...props} />;
    },
  },
  address: {
    propsType: propsTypes.address,
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
    propsType: propsTypes.multiemail,
    //TODO: Make it a ui component
    factory: function MultiEmail({ value, readOnly, label, setValue, ...props }) {
      const placeholder = props.placeholder;
      const { t } = useLocale();
      value = value || [];
      const inputClassName =
        "dark:placeholder:text-muted focus:border-emphasis border-subtle block w-full rounded-md border-default text-sm focus:ring-black disabled:bg-emphasis disabled:hover:cursor-not-allowed dark:selection:bg-green-500 disabled:dark:text-subtle bg-default";
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
                      className={inputClassName}
                      onChange={(e) => {
                        value[index] = e.target.value;
                        setValue(value);
                      }}
                      placeholder={placeholder}
                      label={<></>}
                      required
                      onClickAddon={() => {
                        value.splice(index, 1);
                        setValue(value);
                      }}
                      addOnSuffix={
                        !readOnly ? (
                          <Tooltip content="Remove email">
                            <button className="m-1" type="button">
                              <Icon name="x" width={12} className="text-default" />
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
                  StartIcon="user-plus"
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
              StartIcon="user-plus"
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
    propsType: propsTypes.multiselect,
    factory: (props) => {
      const newProps = {
        ...props,
        listValues: props.options.map((o) => ({ title: o.label, value: o.value })),
      };
      return <Widgets.MultiSelectWidget {...newProps} />;
    },
  },
  select: {
    propsType: propsTypes.select,
    factory: (props) => {
      const newProps = {
        ...props,
        listValues: props.options.map((o) => ({ title: o.label, value: o.value })),
      };
      return <Widgets.SelectWidget {...newProps} />;
    },
  },
  checkbox: {
    propsType: propsTypes.checkbox,
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
                  className="border-default dark:border-default hover:bg-subtle checked:hover:bg-brand-default checked:bg-brand-default dark:checked:bg-brand-default dark:bg-darkgray-100 dark:hover:bg-subtle dark:checked:hover:bg-brand-default h-4 w-4 cursor-pointer rounded ltr:mr-2 rtl:ml-2"
                  value={option.value}
                  checked={value.includes(option.value)}
                />
                <span className="text-emphasis me-2 ms-2 text-sm">{option.label ?? ""}</span>
              </label>
            );
          })}
        </div>
      );
    },
  },
  radio: {
    propsType: propsTypes.radio,
    factory: ({ setValue, name, value, options }) => {
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
                id={`${name}.option.${i}.radio`}
              />
            ))}
          </>
        </Group>
      );
    },
  },
  radioInput: {
    propsType: propsTypes.radioInput,
    factory: function RadioInputWithLabel({ name, options, optionsInputs, value, setValue, readOnly }) {
      useEffect(() => {
        if (!value) {
          setValue({
            value: options[0]?.value,
            optionValue: "",
          });
        }
      }, [options, setValue, value]);

      const { t } = useLocale();

      const getCleanLabel = (option: { label: string; value: string }): string | JSX.Element => {
        if (!option.label) {
          return "";
        }

        return option.label.search(/^https?:\/\//) !== -1 ? (
          <a href={option.label} target="_blank">
            <span className="underline">{option.label}</span>
          </a>
        ) : (
          option.label
        );
      };

      return (
        <div>
          <div>
            <div className="mb-2">
              {options.length > 1 ? (
                options.map((option, i) => {
                  return (
                    <label key={i} className="mb-1 flex items-center">
                      <input
                        type="radio"
                        disabled={readOnly}
                        name={name}
                        className="bg-default after:bg-default border-emphasis focus:ring-brand-default hover:bg-subtle hover:after:bg-subtle dark:checked:after:bg-brand-accent flex h-4 w-4 cursor-pointer items-center justify-center text-[--cal-brand] after:h-[6px] after:w-[6px] after:rounded-full after:content-[''] after:hover:block focus:ring-2 focus:ring-offset-0 ltr:mr-2 rtl:ml-2 dark:checked:hover:text-[--cal-brand]"
                        value={option.value}
                        onChange={(e) => {
                          setValue({
                            value: e.target.value,
                            optionValue: "",
                          });
                        }}
                        checked={value?.value === option.value}
                      />
                      <span className="text-emphasis me-2 ms-2 text-sm">{getCleanLabel(option) ?? ""}</span>
                      <span>
                        {option.value === "phone" && (
                          <InfoBadge content={t("number_in_international_format")} />
                        )}
                      </span>
                    </label>
                  );
                })
              ) : (
                // Show option itself as label because there is just one option
                <>
                  <Label className="flex">
                    {options[0].label}
                    {!readOnly && optionsInputs[options[0].value]?.required ? (
                      <span className="text-default mb-1 ml-1 text-sm font-medium">*</span>
                    ) : null}
                    {options[0].value === "phone" && (
                      <InfoBadge content={t("number_in_international_format")} />
                    )}
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
    propsType: propsTypes.boolean,
    factory: ({ readOnly, name, label, value, setValue }) => {
      return (
        <div className="flex">
          <CheckboxField
            name={name}
            onChange={(e) => {
              if (e.target.checked) {
                setValue(true);
              } else {
                setValue(false);
              }
            }}
            placeholder=""
            checked={value}
            disabled={readOnly}
            description=""
            // Form Builder ensures that it would be safe HTML in here if the field type supports it. So, we can safely use label value in `descriptionAsSafeHtml`
            descriptionAsSafeHtml={label ?? ""}
          />
        </div>
      );
    },
  },
} as const;
// Should use `statisfies` to check if the `type` is from supported types. But satisfies doesn't work with Next.js config
