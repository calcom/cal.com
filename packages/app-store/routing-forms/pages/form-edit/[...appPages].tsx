"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { ClipboardEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { FormCard } from "@calcom/ui/components/card";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Label, BooleanToggleGroupField, SelectField, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Skeleton } from "@calcom/ui/components/skeleton";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import type { RoutingFormWithResponseCount } from "../../components/SingleForm";
import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
} from "../../components/SingleForm";
import { FieldTypes } from "../../lib/FieldTypes";

export { getServerSideProps };
type SelectOption = { label: string; id: string | null };
type HookForm = UseFormReturn<RoutingFormWithResponseCount>;

const appendArray = <T,>({
  target,
  arrayToAppend,
  appendAt,
}: {
  arrayToAppend: T[];
  target: T[];
  appendAt: number;
}) => {
  // Avoid mutating the original array
  const copyOfTarget = [...target];
  const numItemsToRemove = arrayToAppend.length;
  copyOfTarget.splice(appendAt, numItemsToRemove, ...arrayToAppend);
  return copyOfTarget;
};

const PASTE_OPTIONS_SEPARATOR_REGEX = /\n+/;

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
  const watchedOptions =
    useWatch({
      control: hookForm.control,
      name: `${hookFieldNamespace}.options`,
      defaultValue: [
        { label: "", id: uuidv4() },
        { label: "", id: uuidv4() },
        { label: "", id: uuidv4() },
        { label: "", id: uuidv4() },
      ],
    }) || [];

  const setOptions = (updatedOptions: SelectOption[]) => {
    hookForm.setValue(`${hookFieldNamespace}.options`, updatedOptions, { shouldDirty: true });
  };

  const handleRemoveOptions = (index: number) => {
    const updatedOptions = watchedOptions.filter((_, i) => i !== index);
    // We can't let the user remove the last option
    if (updatedOptions.length === 0) {
      return;
    }
    setOptions(updatedOptions);
  };

  const addOption = () => {
    setOptions([
      ...watchedOptions,
      {
        label: "",
        id: uuidv4(),
      },
    ]);
  };

  const router = hookForm.getValues(`${hookFieldNamespace}.router`);
  const routerField = hookForm.getValues(`${hookFieldNamespace}.routerField`);

  const updateLabelAtIndex = ({ label, optionIndex }: { label: string; optionIndex: number }) => {
    const updatedOptions = watchedOptions.map((opt, index) => ({
      ...opt,
      ...(index === optionIndex ? { label } : {}),
    }));

    setOptions(updatedOptions);
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
    const newList = [...watchedOptions];

    const type = watchedOptions[index];
    const tmp = watchedOptions[index + increment];
    if (tmp) {
      newList[index] = tmp;
      newList[index + increment] = type;
    }
    setOptions(newList);
  }

  const handlePasteInOptionAtIndex = ({
    event,
    optionIndex,
  }: {
    event: ClipboardEvent;
    optionIndex: number;
  }) => {
    const paste = event.clipboardData.getData("text");
    // The value being pasted could be a list of options
    const optionsBeingPasted = paste
      .split(PASTE_OPTIONS_SEPARATOR_REGEX)
      .map((optionLabel) => optionLabel.trim())
      .filter((optionLabel) => optionLabel)
      .map((optionLabel) => ({ label: optionLabel.trim(), id: uuidv4() }));
    if (optionsBeingPasted.length === 1) {
      // If there is only one option, we would just let that option be pasted
      return;
    }

    // Don't allow pasting that value, as we would update the options through state update
    event.preventDefault();

    const updatedOptions = appendArray({
      target: watchedOptions,
      arrayToAppend: optionsBeingPasted,
      appendAt: optionIndex,
    });
    setOptions(updatedOptions);
  };

  const optionsPlaceholders = ["< 10", "10 - 100", "100 - 500", "> 500"];

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
              onChange={(e) => {
                hookForm.setValue(`${hookFieldNamespace}.label`, e.target.value, { shouldDirty: true });
              }}
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
                hookForm.setValue(`${hookFieldNamespace}.identifier`, e.target.value, { shouldDirty: true });
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
                {watchedOptions.map((option, index) => (
                  <li
                    // We can't use option.id here as it is undefined and would make keys non-unique causing duplicate items
                    key={`select-option-${index}`}
                    className="group mt-2 flex items-center gap-2"
                    onPaste={(event: ClipboardEvent) =>
                      handlePasteInOptionAtIndex({ event, optionIndex: index })
                    }>
                    <div className="flex flex-col gap-2">
                      {watchedOptions.length && index !== 0 ? (
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          className="bg-default text-muted hover:text-emphasis invisible flex h-6 w-6 scale-0 items-center   justify-center rounded-md border p-1 transition-all hover:border-transparent  hover:shadow group-hover:visible group-hover:scale-100 ">
                          <Icon name="arrow-up" />
                        </button>
                      ) : null}
                      {watchedOptions.length && index !== watchedOptions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          className="bg-default text-muted hover:text-emphasis invisible flex h-6 w-6 scale-0 items-center   justify-center rounded-md border p-1 transition-all hover:border-transparent  hover:shadow group-hover:visible group-hover:scale-100 ">
                          <Icon name="arrow-down" />
                        </button>
                      ) : null}
                    </div>
                    <div className="w-full">
                      <TextField
                        disabled={!!router}
                        containerClassName="[&>*:first-child]:border [&>*:first-child]:border-default hover:[&>*:first-child]:border-gray-400"
                        className="border-0 focus:ring-0 focus:ring-offset-0"
                        labelSrOnly
                        placeholder={optionsPlaceholders[index] ?? "New Option"}
                        value={option.label}
                        type="text"
                        required
                        addOnClassname="bg-transparent border-0"
                        onChange={(e) => updateLabelAtIndex({ label: e.target.value, optionIndex: index })}
                        dataTestid={`${hookFieldNamespace}.options.${index}`}
                        addOnSuffix={
                          watchedOptions.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveOptions(index)}
                              aria-label={t("remove")}>
                              <Icon name="x" className="h-4 w-4" />
                            </button>
                          ) : null
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
                  StartIcon="plus"
                  color="secondary"
                  onClick={addOption}>
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
              StartIcon="plus"
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
        Icon="file-text"
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
  appUrl,
  ...props
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <SingleForm
      {...props}
      appUrl={appUrl}
      Page={({ hookForm, form }) => <FormEdit appUrl={appUrl} hookForm={hookForm} form={form} />}
    />
  );
}
