import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ErrorMessage } from "@hookform/error-message";
import { fieldsSchema } from "form-builder/FormBuilderFieldsSchema";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useFormContext, UseFieldArrayReturn } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Optional } from "@calcom/types/utils";
import { Icon } from "@calcom/ui";
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
} from "@calcom/ui";
import { Switch } from "@calcom/ui";

import { Components } from "./Components";

type RhfForm = {
  fields: z.infer<typeof fieldsSchema>;
};

type RhfFormFields = RhfForm["fields"];
type RhfFormField = RhfFormFields[number];

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
  const FieldTypes: {
    value: RhfForm["fields"][number]["type"];
    label: string;
    needsOptions?: boolean;
    systemOnly?: boolean;
  }[] = [
    {
      label: "Short Text",
      value: "text",
    },
    {
      label: "Number",
      value: "number",
    },
    {
      label: "Long Text",
      value: "textarea",
    },
    {
      label: "Select",
      value: "select",
      needsOptions: true,
    },
    {
      label: "MultiSelect",
      value: "multiselect",
      needsOptions: true,
    },
    {
      label: "Phone",
      value: "phone",
    },
    {
      label: "Email",
      value: "email",
    },
    {
      label: "Multiple Emails",
      value: "multiemail",
    },
    {
      label: "Location",
      value: "radioInput",
      //TODO: Later support it for user fields
      systemOnly: true,
    },
  ];
  // I would have like to give Form Builder it's own Form but nested Forms aren't something that browsers support.
  // So, this would reuse the same Form as the parent form.
  const fieldsForm = useFormContext<RhfForm>();
  const rhfFormPropName = formProp as unknown as "fields";

  const fieldForm = useForm<RhfFormField>();
  const { fields, swap, remove, update, append } = useFieldArray({
    control: fieldsForm.control,
    // TODO: Not sure how to make it configurable and keep TS happy
    name: rhfFormPropName,
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
    value = value || [
      {
        label: "Option 1",
        value: "1",
      },
      {
        label: "Option 2",
        value: "2",
      },
    ];
    // const [optionsState, setOptionsState] = useState(options);
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
                      value.splice(index, 1, { label: e.target.value, value: option.value });
                      onChange(value);
                    }}
                    readOnly={readOnly}
                    placeholder={`Enter Option ${index + 1}`}
                  />
                  {value.length > 2 && !readOnly && (
                    <Button
                      type="button"
                      className="mb-2 -ml-8 hover:!bg-transparent focus:!bg-transparent focus:!outline-none focus:!ring-0"
                      size="icon"
                      color="minimal"
                      StartIcon={Icon.FiX}
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
                value.push({ label: "", value: `${value.length + 1}` });
                onChange(value);
              }}
              StartIcon={Icon.FiPlus}>
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

  const fieldType = FieldTypes.find((f) => f.value === fieldForm.watch("type"));
  return (
    <div>
      <div>
        <div className="text-sm font-semibold text-gray-700 ltr:mr-1 rtl:ml-1">{title}</div>
        <p className=" max-w-[280px] break-words py-1 text-sm text-gray-500 sm:max-w-[500px]">
          {description}
        </p>
        <ul className="mt-2 rounded-md border">
          {fields.map((field, index) => {
            const fieldType = FieldTypes.find((f) => f.value === field.type);
            if (!fieldType) {
              throw new Error(`Invalid field type - ${field.type}`);
            }
            return (
              <li key={index} className="group relative flex justify-between border-b p-4 last:border-b-0">
                <button
                  type="button"
                  className="invisible absolute -left-[12px] ml-0 flex  h-6 w-6 scale-0 items-center justify-center rounded-md border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow disabled:hover:border-inherit disabled:hover:text-gray-400 disabled:hover:shadow-none group-hover:visible group-hover:scale-100"
                  onClick={() => swap(index, index - 1)}>
                  <Icon.FiArrowUp className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="invisible absolute -left-[12px] mt-8 ml-0 flex  h-6 w-6 scale-0  items-center justify-center rounded-md border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow disabled:hover:border-inherit disabled:hover:text-gray-400 disabled:hover:shadow-none group-hover:visible group-hover:scale-100"
                  onClick={() => swap(index, index + 1)}>
                  <Icon.FiArrowDown className="h-5 w-5" />
                </button>
                <div className="flex">
                  <div>
                    <div className="flex items-center">
                      <div className="text-sm font-semibold text-gray-700 ltr:mr-1 rtl:ml-1">
                        {field.label}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="gray">{field.required ? "Required" : "Optional"}</Badge>
                        {field.sources?.map(
                          (s, key) =>
                            s.type !== "user" && (
                              <Badge key={key} variant="blue">
                                {s.label}
                              </Badge>
                            )
                        )}
                      </div>
                    </div>
                    <p className="max-w-[280px] break-words py-1 text-sm text-gray-500 sm:max-w-[500px]">
                      {fieldType.label}
                    </p>
                  </div>
                </div>
                {field.editable !== "readonly" && (
                  <div className="flex items-center space-x-2">
                    {field.editable !== "system" && (
                      <Switch
                        checked={!field.hidden}
                        onCheckedChange={(checked) => {
                          update(index, { ...field, hidden: !checked });
                        }}
                      />
                    )}
                    <Button
                      color="secondary"
                      onClick={() => {
                        editField(index, field);
                      }}>
                      Edit
                    </Button>
                    {field.editable !== "system" && field.editable !== "system-but-optional" && (
                      <Button
                        className="!p-0"
                        color="minimal"
                        onClick={() => {
                          removeField(index);
                        }}
                        StartIcon={Icon.FiTrash2}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <Button color="minimal" onClick={addField} className="mt-4" StartIcon={Icon.FiPlus}>
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
          <DialogHeader title="Add a question" subtitle="Customize the questions asked on the booking page" />
          <div>
            <Form
              form={fieldForm}
              handleSubmit={(data) => {
                if (fieldDialog.fieldIndex !== -1) {
                  update(fieldDialog.fieldIndex, data);
                } else {
                  const field = {
                    ...data,
                    sources: [
                      {
                        label: "User",
                        type: "user",
                        id: "user",
                      },
                    ],
                  };
                  append(field);
                }
                setFieldDialog({
                  isOpen: false,
                  fieldIndex: -1,
                });
              }}>
              <SelectField
                required
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
                value={FieldTypes.find((fieldType) => fieldType.value === fieldForm.getValues("type"))}
                options={FieldTypes.filter((f) => !f.systemOnly)}
                label="Input Type"
              />
              <InputField {...fieldForm.register("label")} required containerClassName="mt-6" label="Label" />
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
                {/* TODO: i18n missing */}
                <Button type="submit">Add</Button>
              </DialogFooter>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const WithLabel = ({
  field,
  children,
  readOnly,
}: {
  field: Partial<RhfFormField>;
  readOnly: boolean;
  children: React.ReactNode;
}) => {
  const { t } = useLocale();
  return (
    <div>
      <div className="mb-2 flex items-center">
        <Label className="!mb-0">{field.label}</Label>
        {!readOnly && !field.required && (
          <Badge className="ml-2" variant="gray">
            {t("optional")}
          </Badge>
        )}
      </div>
      {children}
    </div>
  );
};

export const ComponentForField = ({
  field,
  value,
  setValue,
  readOnly,
}: {
  field: {
    // Label is optional because radioInput doesn't have a label
    label?: string;
    required?: boolean;
    name?: string;
    options?: RhfFormField["options"];
    optionsInputs?: RhfFormField["optionsInputs"];
    type: RhfFormField["type"];
  };
  value:
    | string
    | {
        value: string;
        optionValue: string;
      };
  setValue: ((value: string) => void) | ((value: { value: string; optionValue: string }) => void);
  readOnly: boolean;
}) => {
  const componentConfig = Components[field.type];
  const isObjectiveWithInputValue = (value: any): value is { value: string } => {
    if (typeof value === "undefined") {
      return true;
    }
    return typeof value === "object" && "value" in value;
  };

  if (componentConfig.propsType === "text") {
    value = value || "";
    if (isObjectiveWithInputValue(value)) {
      throw new Error(`${value}: Value is not of type string for field type ${field.type}`);
    }
    return (
      <WithLabel field={field} readOnly>
        <componentConfig.factory
          readOnly={readOnly}
          value={value}
          setValue={setValue as (value: string) => void}
        />
      </WithLabel>
    );
  }

  if (componentConfig.propsType === "select") {
    value = value || "";
    if (isObjectiveWithInputValue(value)) {
      throw new Error(`${value}: Value is not of type string for field type ${field.type}`);
    }
    if (!field.options) {
      throw new Error("Field options is not defined");
    }

    return (
      <WithLabel field={field} readOnly>
        <componentConfig.factory
          readOnly={readOnly}
          value={value}
          setValue={setValue as (value: string) => void}
          listValues={field.options.map((o) => ({ ...o, title: o.label }))}
        />
      </WithLabel>
    );
  }

  if (componentConfig.propsType === "objectiveWithInput") {
    if (!isObjectiveWithInputValue(value)) {
      throw new Error("Value is not of type {value: string}");
    }
    if (!field.options) {
      throw new Error("Field options is not defined");
    }
    if (!field.optionsInputs) {
      throw new Error("Field optionsInputs is not defined");
    }
    return field.options.length ? (
      <WithLabel field={field} readOnly>
        <componentConfig.factory
          readOnly={readOnly}
          name={field.name}
          value={value}
          setValue={setValue as (value: { value: string; optionValue: string }) => void}
          optionsInputs={field.optionsInputs}
          options={field.options}
        />
      </WithLabel>
    ) : null;
  }
  return null;
};

//TODO: ManageBookings: Move it along FormBuilder - Also create a story for it.
export const FormBuilderField = ({
  field,
  readOnly,
}: {
  field: RhfFormFields[number];
  readOnly: boolean;
}) => {
  const { t } = useLocale();
  const { control, formState } = useFormContext();
  return (
    <div className="reloading mb-4">
      <Controller
        control={control}
        name={`responses.${field.name}`}
        render={({ field: { value, onChange } }) => {
          return (
            <div>
              <ComponentForField
                // className={
                //   hookForm.formState.errors[`inputs.${field.name}`] && "!focus:ring-red-700 !border-red-700"
                // }
                field={field}
                value={value}
                // Choose b/w disabled and readOnly
                readOnly={readOnly}
                setValue={(val: any) => {
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
                  // console.error(name, field.name, message, "ErrorMesg");

                  message = message.replace(/\{[^}]+\}(.*)/, "$1");
                  return (
                    <div data-field-name={field.name} className="flex items-center text-sm text-red-700 ">
                      <Icon.FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
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
