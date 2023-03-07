import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ErrorMessage } from "@hookform/error-message";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useFormContext } from "react-hook-form";
import type { z } from "zod";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Label,
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  Form,
  BooleanToggleGroupField,
  SelectField,
  InputField,
  Input,
  showToast,
} from "@calcom/ui";
import { Switch } from "@calcom/ui";
import { FiArrowDown, FiArrowUp, FiX, FiPlus, FiTrash2, FiInfo } from "@calcom/ui/components/icon";

import { Components } from "./Components";
import type { fieldsSchema } from "./FormBuilderFieldsSchema";

type RhfForm = {
  fields: z.infer<typeof fieldsSchema>;
};

type RhfFormFields = RhfForm["fields"];
type RhfFormField = RhfFormFields[number];

/**
 * It works with a react-hook-form only.
 * `formProp` specifies the name of the property in the react-hook-form that has the fields. This is where fields would be updated.
 */
export const FormBuilder = function FormBuilder({
  title,
  description,
  addFieldLabel,
  formProp,
}: {
  formProp: string;
  title: string;
  description: string;
  addFieldLabel: string;
}) {
  const FieldTypesMap: Record<
    string,
    {
      value: RhfForm["fields"][number]["type"];
      label: string;
      needsOptions?: boolean;
      systemOnly?: boolean;
      isTextType?: boolean;
    }
  > = {
    name: {
      label: "Name",
      value: "name",
      isTextType: true,
    },
    email: {
      label: "Email",
      value: "email",
      isTextType: true,
    },
    phone: {
      label: "Phone",
      value: "phone",
      isTextType: true,
    },
    text: {
      label: "Short Text",
      value: "text",
      isTextType: true,
    },
    number: {
      label: "Number",
      value: "number",
      isTextType: true,
    },
    textarea: {
      label: "Long Text",
      value: "textarea",
      isTextType: true,
    },
    select: {
      label: "Select",
      value: "select",
      needsOptions: true,
      isTextType: true,
    },
    multiselect: {
      label: "MultiSelect",
      value: "multiselect",
      needsOptions: true,
      isTextType: false,
    },
    multiemail: {
      label: "Multiple Emails",
      value: "multiemail",
      isTextType: true,
    },
    radioInput: {
      label: "Radio Input",
      value: "radioInput",
      isTextType: false,
      systemOnly: true,
    },
    checkbox: {
      label: "Checkbox Group",
      value: "checkbox",
      needsOptions: true,
      isTextType: false,
    },
    radio: {
      label: "Radio Group",
      value: "radio",
      needsOptions: true,
      isTextType: false,
    },
    boolean: {
      label: "Checkbox",
      value: "boolean",
      isTextType: false,
    },
  };
  const FieldTypes = Object.values(FieldTypesMap);

  // I would have liked to give Form Builder it's own Form but nested Forms aren't something that browsers support.
  // So, this would reuse the same Form as the parent form.
  const fieldsForm = useFormContext<RhfForm>();

  const { t } = useLocale();
  const fieldForm = useForm<RhfFormField>();
  const { fields, swap, remove, update, append } = useFieldArray({
    control: fieldsForm.control,
    // HACK: It allows any property name to be used for instead of `fields` property name
    name: formProp as unknown as "fields",
  });

  function OptionsField({
    label = "Options",
    value,
    onChange,
    className = "",
    readOnly = false,
  }: {
    label?: string;
    value: { label: string; value: string }[];
    onChange: (value: { label: string; value: string }[]) => void;
    className?: string;
    readOnly?: boolean;
  }) {
    const [animationRef] = useAutoAnimate<HTMLUListElement>();
    if (!value) {
      onChange([
        {
          label: "Option 1",
          value: "Option 1",
        },
        {
          label: "Option 2",
          value: "Option 2",
        },
      ]);
    }
    return (
      <div className={className}>
        <Label>{label}</Label>
        <div className="rounded-md bg-gray-50 p-4">
          <ul ref={animationRef}>
            {value?.map((option, index) => (
              <li key={index}>
                <div className="flex items-center">
                  <Input
                    required
                    value={option.label}
                    onChange={(e) => {
                      // Right now we use label of the option as the value of the option. It allows us to not separately lookup the optionId to know the optionValue
                      // It has the same drawback that if the label is changed, the value of the option will change. It is not a big deal for now.
                      value.splice(index, 1, {
                        label: e.target.value,
                        value: e.target.value.toLowerCase().trim(),
                      });
                      onChange(value);
                    }}
                    readOnly={readOnly}
                    placeholder={`Enter Option ${index + 1}`}
                  />
                  {value.length > 2 && !readOnly && (
                    <Button
                      type="button"
                      className="mb-2 -ml-8 hover:!bg-transparent focus:!bg-transparent focus:!outline-none focus:!ring-0"
                      size="sm"
                      color="minimal"
                      StartIcon={FiX}
                      onClick={() => {
                        if (!value) {
                          return;
                        }
                        const newOptions = [...value];
                        newOptions.splice(index, 1);
                        onChange(newOptions);
                      }}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
          {!readOnly && (
            <Button
              color="minimal"
              onClick={() => {
                value.push({ label: "", value: "" });
                onChange(value);
              }}
              StartIcon={FiPlus}>
              Add an Option
            </Button>
          )}
        </div>
      </div>
    );
  }
  const [fieldDialog, setFieldDialog] = useState({
    isOpen: false,
    fieldIndex: -1,
  });

  const addField = () => {
    fieldForm.reset({});
    setFieldDialog({
      isOpen: true,
      fieldIndex: -1,
    });
  };

  const editField = (index: number, data: RhfFormField) => {
    fieldForm.reset(data);
    setFieldDialog({
      isOpen: true,
      fieldIndex: index,
    });
  };

  const removeField = (index: number) => {
    remove(index);
  };

  const fieldType = FieldTypesMap[fieldForm.watch("type") || "text"];
  const isFieldEditMode = fieldDialog.fieldIndex !== -1;
  return (
    <div>
      <div>
        <div className="text-sm font-semibold text-gray-700 ltr:mr-1 rtl:ml-1">{title}</div>
        <p className="max-w-[280px] break-words py-1 text-sm text-gray-500 sm:max-w-[500px]">{description}</p>
        <ul className="mt-2 rounded-md border">
          {fields.map((field, index) => {
            const fieldType = FieldTypesMap[field.type];

            // Hidden fields can't be required
            const isRequired = field.required && !field.hidden;

            if (!fieldType) {
              throw new Error(`Invalid field type - ${field.type}`);
            }
            const sources = field.sources || [];
            const groupedBySourceLabel = sources.reduce((groupBy, source) => {
              const item = groupBy[source.label] || [];
              if (source.type === "user" || source.type === "default") {
                return groupBy;
              }
              item.push(source);
              groupBy[source.label] = item;
              return groupBy;
            }, {} as Record<string, NonNullable<(typeof field)["sources"]>>);

            return (
              <li
                key={index}
                className="group relative flex items-center justify-between border-b p-4 last:border-b-0">
                <button
                  type="button"
                  className="invisible absolute -left-[12px] -mt-4 mb-4 -ml-4 hidden h-6 w-6 scale-0 items-center justify-center rounded-md border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow disabled:hover:border-inherit disabled:hover:text-gray-400 disabled:hover:shadow-none group-hover:visible group-hover:scale-100 sm:ml-0 sm:flex"
                  onClick={() => swap(index, index - 1)}>
                  <FiArrowUp className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="invisible absolute -left-[12px] mt-8 -ml-4 hidden h-6 w-6 scale-0 items-center justify-center rounded-md border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow disabled:hover:border-inherit disabled:hover:text-gray-400 disabled:hover:shadow-none group-hover:visible group-hover:scale-100 sm:ml-0 sm:flex"
                  onClick={() => swap(index, index + 1)}>
                  <FiArrowDown className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex flex-col lg:flex-row lg:items-center">
                    <div className="text-sm font-semibold text-gray-700 ltr:mr-1 rtl:ml-1">
                      {field.label || t(field.defaultLabel || "")}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="gray">{isRequired ? "Required" : "Optional"}</Badge>
                      {field.hidden ? <Badge variant="gray">Hidden</Badge> : null}
                      {Object.entries(groupedBySourceLabel).map(([sourceLabel, sources], key) => (
                        // We don't know how to pluralize `sourceLabel` because it can be anything
                        <Badge key={key} variant="blue">
                          {sources.length} {sources.length === 1 ? sourceLabel : `${sourceLabel}s`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="max-w-[280px] break-words py-1 text-sm text-gray-500 sm:max-w-[500px]">
                    {fieldType.label}
                  </p>
                </div>
                {field.editable !== "user-readonly" && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      disabled={field.editable === "system"}
                      tooltip={field.editable === "system" ? t("form_builder_system_field_cant_toggle") : ""}
                      checked={!field.hidden}
                      onCheckedChange={(checked) => {
                        update(index, { ...field, hidden: !checked });
                      }}
                    />
                    <Button
                      color="secondary"
                      onClick={() => {
                        editField(index, field);
                      }}>
                      Edit
                    </Button>
                    <Button
                      color="minimal"
                      tooltip={
                        field.editable === "system" || field.editable === "system-but-optional"
                          ? t("form_builder_system_field_cant_delete")
                          : ""
                      }
                      disabled={field.editable === "system" || field.editable === "system-but-optional"}
                      variant="icon"
                      onClick={() => {
                        removeField(index);
                      }}
                      StartIcon={FiTrash2}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <Button color="minimal" onClick={addField} className="mt-4" StartIcon={FiPlus}>
          {addFieldLabel}
        </Button>
      </div>
      <Dialog
        open={fieldDialog.isOpen}
        onOpenChange={(isOpen) =>
          setFieldDialog({
            isOpen,
            fieldIndex: -1,
          })
        }>
        <DialogContent>
          <DialogHeader title={t("add_a_booking_question")} subtitle={t("form_builder_field_add_subtitle")} />
          <div>
            <Form
              form={fieldForm}
              handleSubmit={(data) => {
                const type = data.type || "text";
                const isNewField = fieldDialog.fieldIndex == -1;
                if (isNewField && fields.some((f) => f.name === data.name)) {
                  showToast(t("form_builder_field_already_exists"), "error");
                  return;
                }
                if (fieldDialog.fieldIndex !== -1) {
                  update(fieldDialog.fieldIndex, data);
                } else {
                  const field: RhfFormField = {
                    ...data,
                    type,
                    sources: [
                      {
                        label: "User",
                        type: "user",
                        id: "user",
                        fieldRequired: data.required,
                      },
                    ],
                  };
                  field.editable = field.editable || "user";
                  append(field);
                }
                setFieldDialog({
                  isOpen: false,
                  fieldIndex: -1,
                });
              }}>
              <SelectField
                defaultValue={FieldTypes[3]} // "text" as defaultValue
                isDisabled={
                  fieldForm.getValues("editable") === "system" ||
                  fieldForm.getValues("editable") === "system-but-optional"
                }
                onChange={(e) => {
                  const value = e?.value;
                  if (!value) {
                    return;
                  }
                  fieldForm.setValue("type", value);
                }}
                value={FieldTypesMap[fieldForm.getValues("type")]}
                options={FieldTypes.filter((f) => !f.systemOnly)}
                label="Input Type"
              />
              <InputField
                required
                {...fieldForm.register("name")}
                containerClassName="mt-6"
                disabled={
                  fieldForm.getValues("editable") === "system" ||
                  fieldForm.getValues("editable") === "system-but-optional"
                }
                label="Name"
              />
              <InputField
                {...fieldForm.register("label")}
                // System fields have a defaultLabel, so there a label is not required
                required={!["system", "system-but-optional"].includes(fieldForm.getValues("editable") || "")}
                placeholder={t(fieldForm.getValues("defaultLabel") || "")}
                containerClassName="mt-6"
                label="Label"
              />
              {fieldType?.isTextType ? (
                <InputField
                  {...fieldForm.register("placeholder")}
                  containerClassName="mt-6"
                  label="Placeholder"
                  placeholder={t(fieldForm.getValues("defaultPlaceholder") || "")}
                />
              ) : null}

              {fieldType?.needsOptions ? (
                <Controller
                  name="options"
                  render={({ field: { value, onChange } }) => {
                    return <OptionsField onChange={onChange} value={value} className="mt-6" />;
                  }}
                />
              ) : null}
              <Controller
                name="required"
                control={fieldForm.control}
                render={({ field: { value, onChange } }) => {
                  return (
                    <BooleanToggleGroupField
                      disabled={fieldForm.getValues("editable") === "system"}
                      value={value}
                      onValueChange={(val) => {
                        onChange(val);
                      }}
                      label="Required"
                    />
                  );
                }}
              />
              <DialogFooter>
                <DialogClose color="secondary">Cancel</DialogClose>
                <Button type="submit">{isFieldEditMode ? t("save") : t("add")}</Button>
              </DialogFooter>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// TODO: Add consistent `label` support to all the components and then remove the usage of WithLabel.
// Label should be handled by each Component itself.
const WithLabel = ({
  field,
  children,
  readOnly,
}: {
  field: Partial<RhfFormField>;
  readOnly: boolean;
  children: React.ReactNode;
}) => {
  return (
    <div>
      {/* multiemail doesnt show label initially. It is shown on clicking CTA */}
      {/* boolean type doesn't have a label overall, the radio has it's own label */}
      {/* Component itself managing it's label should remove these checks */}
      {field.type !== "boolean" && field.type !== "multiemail" && field.label && (
        <div className="mb-2 flex items-center">
          <Label className="!mb-0 flex items-center">{field.label}</Label>
          <span className="ml-1 -mb-1 text-sm font-medium leading-none dark:text-white">
            {!readOnly && field.required ? "*" : ""}
          </span>
        </div>
      )}
      {children}
    </div>
  );
};

type ValueProps =
  | {
      value: string[];
      setValue: (value: string[]) => void;
    }
  | {
      value: string;
      setValue: (value: string) => void;
    }
  | {
      value: {
        value: string;
        optionValue: string;
      };
      setValue: (value: { value: string; optionValue: string }) => void;
    }
  | {
      value: boolean;
      setValue: (value: boolean) => void;
    };

export const ComponentForField = ({
  field,
  value,
  setValue,
  readOnly,
}: {
  field: Omit<RhfFormField, "editable" | "label"> & {
    // Label is optional because radioInput doesn't have a label
    label?: string;
  };
  readOnly: boolean;
} & ValueProps) => {
  const fieldType = field.type || "text";
  const componentConfig = Components[fieldType];

  const isValueOfPropsType = (val: unknown, propsType: typeof componentConfig.propsType) => {
    const propsTypeConditionMap = {
      boolean: typeof val === "boolean",
      multiselect: val instanceof Array && val.every((v) => typeof v === "string"),
      objectiveWithInput: typeof val === "object" && val !== null ? "value" in val : false,
      select: typeof val === "string",
      text: typeof val === "string",
      textList: val instanceof Array && val.every((v) => typeof v === "string"),
    } as const;
    if (!propsTypeConditionMap[propsType]) throw new Error(`Unknown propsType ${propsType}`);
    return propsTypeConditionMap[propsType];
  };

  // If possible would have wanted `isValueOfPropsType` to narrow the type of `value` and `setValue` accordingly, but can't seem to do it.
  // So, code following this uses type assertion to tell TypeScript that everything has been validated
  if (value !== undefined && !isValueOfPropsType(value, componentConfig.propsType)) {
    throw new Error(
      `Value ${value} is not valid for type ${componentConfig.propsType} for field ${field.name}`
    );
  }

  if (componentConfig.propsType === "text") {
    return (
      <WithLabel field={field} readOnly={readOnly}>
        <componentConfig.factory
          placeholder={field.placeholder}
          label={field.label}
          readOnly={readOnly}
          name={field.name}
          value={value as string}
          setValue={setValue as (arg: typeof value) => void}
        />
      </WithLabel>
    );
  }

  if (componentConfig.propsType === "boolean") {
    return (
      <WithLabel field={field} readOnly={readOnly}>
        <componentConfig.factory
          label={field.label}
          readOnly={readOnly}
          value={value as boolean}
          setValue={setValue as (arg: typeof value) => void}
          placeholder={field.placeholder}
        />
      </WithLabel>
    );
  }

  if (componentConfig.propsType === "textList") {
    return (
      <WithLabel field={field} readOnly={readOnly}>
        <componentConfig.factory
          placeholder={field.placeholder}
          label={field.label}
          readOnly={readOnly}
          value={value as string[]}
          setValue={setValue as (arg: typeof value) => void}
        />
      </WithLabel>
    );
  }

  if (componentConfig.propsType === "select") {
    if (!field.options) {
      throw new Error("Field options is not defined");
    }

    return (
      <WithLabel field={field} readOnly={readOnly}>
        <componentConfig.factory
          readOnly={readOnly}
          value={value as string}
          placeholder={field.placeholder}
          setValue={setValue as (arg: typeof value) => void}
          options={field.options.map((o) => ({ ...o, title: o.label }))}
        />
      </WithLabel>
    );
  }

  if (componentConfig.propsType === "multiselect") {
    if (!field.options) {
      throw new Error("Field options is not defined");
    }
    return (
      <WithLabel field={field} readOnly={readOnly}>
        <componentConfig.factory
          placeholder={field.placeholder}
          readOnly={readOnly}
          value={value as string[]}
          setValue={setValue as (arg: typeof value) => void}
          options={field.options.map((o) => ({ ...o, title: o.label }))}
        />
      </WithLabel>
    );
  }

  if (componentConfig.propsType === "objectiveWithInput") {
    if (!field.options) {
      throw new Error("Field options is not defined");
    }
    if (!field.optionsInputs) {
      throw new Error("Field optionsInputs is not defined");
    }
    return field.options.length ? (
      <WithLabel field={field} readOnly={readOnly}>
        <componentConfig.factory
          placeholder={field.placeholder}
          readOnly={readOnly}
          name={field.name}
          value={value as { value: string; optionValue: string }}
          setValue={setValue as (arg: typeof value) => void}
          optionsInputs={field.optionsInputs}
          options={field.options}
        />
      </WithLabel>
    ) : null;
  }

  throw new Error(`Field ${field.name} does not have a valid propsType`);
};

export const FormBuilderField = ({
  field,
  readOnly,
  className,
}: {
  field: RhfFormFields[number];
  readOnly: boolean;
  className: string;
}) => {
  const { t } = useLocale();
  const { control, formState } = useFormContext();
  return (
    <div
      data-form-builder-field-name={field.name}
      className={classNames(className, field.hidden ? "hidden" : "")}>
      <Controller
        control={control}
        // Make it a variable
        name={`responses.${field.name}`}
        render={({ field: { value, onChange } }) => {
          return (
            <div>
              <ComponentForField
                field={field}
                value={value}
                readOnly={readOnly}
                setValue={(val: unknown) => {
                  onChange(val);
                }}
              />
              <ErrorMessage
                name="responses"
                errors={formState.errors}
                render={({ message }) => {
                  const name = message?.replace(/\{([^}]+)\}.*/, "$1");
                  // Use the message targeted for it.
                  if (name !== field.name) {
                    return null;
                  }

                  message = message.replace(/\{[^}]+\}(.*)/, "$1").trim();
                  if (field.hidden) {
                    console.error(`Error message for hidden field:${field.name} => ${message}`);
                  }
                  return (
                    <div
                      data-field-name={field.name}
                      className="mt-2 flex items-center text-sm text-red-700 ">
                      <FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
                      <p>{t(message)}</p>
                    </div>
                  );
                }}
              />
            </div>
          );
        }}
      />
    </div>
  );
};
