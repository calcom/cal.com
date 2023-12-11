import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { Controller, useFieldArray } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import Shell from "@calcom/features/shell/Shell";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  BooleanToggleGroupField,
  Button,
  EmptyScreen,
  FormCard,
  Label,
  SelectField,
  Skeleton,
  TextField,
} from "@calcom/ui";
import { Plus, FileText, X, ArrowUp, ArrowDown } from "@calcom/ui/components/icon";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import type { RoutingFormWithResponseCount } from "../../components/SingleForm";
import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
} from "../../components/SingleForm";

export { getServerSideProps };
type HookForm = UseFormReturn<RoutingFormWithResponseCount>;
type SelectOption = { placeholder: string; value: string; id: string };

export const FieldTypes = [
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
    label: "Single Selection",
    value: "select",
  },
  {
    label: "Multiple Selection",
    value: "multiselect",
  },
  {
    label: "Phone",
    value: "phone",
  },
  {
    label: "Email",
    value: "email",
  },
];

function Field({
  hookForm,
  hookFieldNamespace,
  deleteField,
  moveUp,
  moveDown,
  appUrl,
}: {
  fieldIndex: number;
  hookForm: HookForm;
  hookFieldNamespace: `fields.${number}`;
  deleteField: {
    check: () => boolean;
    fn: () => void;
  };
  moveUp: {
    check: () => boolean;
    fn: () => void;
  };
  moveDown: {
    check: () => boolean;
    fn: () => void;
  };
  appUrl: string;
}) {
  const { t } = useLocale();
  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  const [options, setOptions] = useState<SelectOption[]>([
    { placeholder: "< 10", value: "", id: uuidv4() },
    { placeholder: "10-100", value: "", id: uuidv4() },
    { placeholder: "100-500", value: "", id: uuidv4() },
    { placeholder: "> 500", value: "", id: uuidv4() },
  ]);

  const handleRemoveOptions = (index: number) => {
    const updatedOptions = options.filter((_, i) => i !== index);
    setOptions(updatedOptions);
    updateSelectText(updatedOptions);
  };

  const handleAddOptions = () => {
    setOptions((prevState) => [
      ...prevState,
      {
        placeholder: "New Option",
        value: "",
        id: uuidv4(),
      },
    ]);
  };

  useEffect(() => {
    const originalValues = hookForm.getValues(`${hookFieldNamespace}.selectText`);
    if (originalValues) {
      const values: SelectOption[] = originalValues.split("\n").map((fieldValue) => ({
        value: fieldValue,
        placeholder: "",
        id: uuidv4(),
      }));
      setOptions(values);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const router = hookForm.getValues(`${hookFieldNamespace}.router`);
  const routerField = hookForm.getValues(`${hookFieldNamespace}.routerField`);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, optionIndex: number) => {
    const updatedOptions = options.map((opt, index) => ({
      ...opt,
      ...(index === optionIndex ? { value: e.target.value } : {}),
    }));

    setOptions(updatedOptions);
    updateSelectText(updatedOptions);
  };

  const updateSelectText = (updatedOptions: SelectOption[]) => {
    hookForm.setValue(
      `${hookFieldNamespace}.selectText`,
      updatedOptions
        .filter((opt) => opt.value)
        .map((opt) => opt.value)
        .join("\n")
    );
  };

  const label = useWatch({
    control: hookForm.control,
    name: `${hookFieldNamespace}.label`,
  });

  const identifier = useWatch({
    control: hookForm.control,
    name: `${hookFieldNamespace}.identifier`,
  });

  function move(index: number, increment: 1 | -1) {
    const newList = [...options];

    const type = options[index];
    const tmp = options[index + increment];
    if (tmp) {
      newList[index] = tmp;
      newList[index + increment] = type;
    }
    setOptions(newList);
    updateSelectText(newList);
  }

  return (
    <div
      data-testid="field"
      className="bg-default group mb-4 flex w-full items-center justify-between ltr:mr-2 rtl:ml-2">
      <FormCard
        label="Field"
        moveUp={moveUp}
        moveDown={moveDown}
        badge={
          router ? { text: router.name, variant: "gray", href: `${appUrl}/form-edit/${router.id}` } : null
        }
        deleteField={router ? null : deleteField}>
        <div className="w-full">
          <div className="mb-6 w-full">
            <TextField
              data-testid={`${hookFieldNamespace}.label`}
              disabled={!!router}
              label="Label"
              className="flex-grow"
              placeholder={t("this_is_what_your_users_would_see")}
              /**
               * This is a bit of a hack to make sure that for routerField, label is shown from there.
               * For other fields, value property is used because it exists and would take precedence
               */
              defaultValue={label || routerField?.label || ""}
              required
              {...hookForm.register(`${hookFieldNamespace}.label`)}
            />
          </div>
          <div className="mb-6 w-full">
            <TextField
              disabled={!!router}
              label="Identifier"
              name={`${hookFieldNamespace}.identifier`}
              required
              placeholder={t("identifies_name_field")}
              //This change has the same effects that already existed in relation to this field,
              // but written in a different way.
              // The identifier field will have the same value as the label field until it is changed
              value={identifier || routerField?.identifier || label || routerField?.label || ""}
              onChange={(e) => {
                hookForm.setValue(`${hookFieldNamespace}.identifier`, e.target.value);
              }}
            />
          </div>
          <div className="mb-6 w-full ">
            <Controller
              name={`${hookFieldNamespace}.type`}
              control={hookForm.control}
              defaultValue={routerField?.type}
              render={({ field: { value, onChange } }) => {
                const defaultValue = FieldTypes.find((fieldType) => fieldType.value === value);
                return (
                  <SelectField
                    maxMenuHeight={200}
                    styles={{
                      singleValue: (baseStyles) => ({
                        ...baseStyles,
                        fontSize: "14px",
                      }),
                      option: (baseStyles) => ({
                        ...baseStyles,
                        fontSize: "14px",
                      }),
                    }}
                    label="Type"
                    isDisabled={!!router}
                    containerClassName="data-testid-field-type"
                    options={FieldTypes}
                    onChange={(option) => {
                      if (!option) {
                        return;
                      }
                      onChange(option.value);
                    }}
                    defaultValue={defaultValue}
                  />
                );
              }}
            />
          </div>
          {["select", "multiselect"].includes(hookForm.watch(`${hookFieldNamespace}.type`)) ? (
            <div className="mt-2 w-full">
              <Skeleton as={Label} loadingClassName="w-16" title={t("Options")}>
                {t("options")}
              </Skeleton>
              <ul ref={animationRef}>
                {options.map((field, index) => (
                  <li key={`select-option-${field.id}`} className="group mt-2 flex items-center gap-2">
                    <div className="flex flex-col gap-2">
                      {options.length && index !== 0 ? (
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          className="bg-default text-muted hover:text-emphasis invisible flex h-6 w-6 scale-0 items-center   justify-center rounded-md border p-1 transition-all hover:border-transparent  hover:shadow group-hover:visible group-hover:scale-100 ">
                          <ArrowUp />
                        </button>
                      ) : null}
                      {options.length && index !== options.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          className="bg-default text-muted hover:text-emphasis invisible flex h-6 w-6 scale-0 items-center   justify-center rounded-md border p-1 transition-all hover:border-transparent  hover:shadow group-hover:visible group-hover:scale-100 ">
                          <ArrowDown />
                        </button>
                      ) : null}
                    </div>
                    <div className="w-full">
                      <TextField
                        disabled={!!router}
                        containerClassName="[&>*:first-child]:border [&>*:first-child]:border-default hover:[&>*:first-child]:border-gray-400"
                        className="border-0 focus:ring-0 focus:ring-offset-0"
                        labelSrOnly
                        placeholder={field.placeholder.toString()}
                        value={field.value}
                        type="text"
                        addOnClassname="bg-transparent border-0"
                        onChange={(e) => handleChange(e, index)}
                        addOnSuffix={
                          <button
                            type="button"
                            onClick={() => handleRemoveOptions(index)}
                            aria-label={t("remove")}>
                            <X className="h-4 w-4" />
                          </button>
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <div className={classNames("flex")}>
                <Button
                  data-testid="add-attribute"
                  className="border-none"
                  type="button"
                  StartIcon={Plus}
                  color="secondary"
                  onClick={handleAddOptions}>
                  Add an option
                </Button>
              </div>
            </div>
          ) : null}

          <div className="w-[106px]">
            <Controller
              name={`${hookFieldNamespace}.required`}
              control={hookForm.control}
              defaultValue={routerField?.required}
              render={({ field: { value, onChange } }) => {
                return (
                  <BooleanToggleGroupField
                    variant="small"
                    disabled={!!router}
                    label={t("required")}
                    value={value}
                    onValueChange={onChange}
                  />
                );
              }}
            />
          </div>
        </div>
      </FormCard>
    </div>
  );
}

const FormEdit = ({
  hookForm,
  form,
  appUrl,
}: {
  hookForm: HookForm;
  form: inferSSRProps<typeof getServerSideProps>["form"];
  appUrl: string;
}) => {
  const fieldsNamespace = "fields";
  const {
    fields: hookFormFields,
    append: appendHookFormField,
    remove: removeHookFormField,
    swap: swapHookFormField,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore https://github.com/react-hook-form/react-hook-form/issues/6679
  } = useFieldArray({
    control: hookForm.control,
    name: fieldsNamespace,
  });

  const [animationRef] = useAutoAnimate<HTMLDivElement>();

  const addField = () => {
    appendHookFormField({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      id: uuidv4(),
      // This is same type from react-awesome-query-builder
      type: "text",
      label: "",
    });
  };

  // hookForm.reset(form);
  if (!form.fields) {
    form.fields = [];
  }
  return hookFormFields.length ? (
    <div className="flex flex-col-reverse lg:flex-row">
      <div className="w-full ltr:mr-2 rtl:ml-2">
        <div ref={animationRef} className="flex w-full flex-col rounded-md">
          {hookFormFields.map((field, key) => {
            return (
              <Field
                appUrl={appUrl}
                fieldIndex={key}
                hookForm={hookForm}
                hookFieldNamespace={`${fieldsNamespace}.${key}`}
                deleteField={{
                  check: () => hookFormFields.length > 1,
                  fn: () => {
                    removeHookFormField(key);
                  },
                }}
                moveUp={{
                  check: () => key !== 0,
                  fn: () => {
                    swapHookFormField(key, key - 1);
                  },
                }}
                moveDown={{
                  check: () => key !== hookFormFields.length - 1,
                  fn: () => {
                    if (key === hookFormFields.length - 1) {
                      return;
                    }
                    swapHookFormField(key, key + 1);
                  },
                }}
                key={key}
              />
            );
          })}
        </div>
        {hookFormFields.length ? (
          <div className={classNames("flex")}>
            <Button
              data-testid="add-field"
              type="button"
              StartIcon={Plus}
              color="secondary"
              onClick={addField}>
              Add field
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  ) : (
    <div className="bg-default w-full">
      <EmptyScreen
        Icon={FileText}
        headline="Create your first field"
        description="Fields are the form fields that the booker would see."
        buttonRaw={
          <Button data-testid="add-field" onClick={addField}>
            Create Field
          </Button>
        }
      />
    </div>
  );
};

export default function FormEditPage({
  form,
  appUrl,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <SingleForm
      form={form}
      appUrl={appUrl}
      Page={({ hookForm, form }) => <FormEdit appUrl={appUrl} hookForm={hookForm} form={form} />}
    />
  );
}

FormEditPage.getLayout = (page: React.ReactElement) => {
  return (
    <Shell backPath="/apps/routing-forms/forms" withoutMain={true}>
      {page}
    </Shell>
  );
};
