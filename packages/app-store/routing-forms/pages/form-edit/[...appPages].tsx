"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { UseFormReturn } from "react-hook-form";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { FormCard } from "@calcom/ui/components/card";
import { BooleanToggleGroupField, SelectField, TextField } from "@calcom/ui/components/form";
import { MultiOptionInput } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
} from "../../components/SingleForm";
import { FieldTypes } from "../../lib/FieldTypes";
import type { RoutingFormWithResponseCount } from "../../types/types";

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

  const router = hookForm.getValues(`${hookFieldNamespace}.router`);
  const routerField = hookForm.getValues(`${hookFieldNamespace}.routerField`);

  const label = useWatch({
    control: hookForm.control,
    name: `${hookFieldNamespace}.label`,
  });

  const identifier = useWatch({
    control: hookForm.control,
    name: `${hookFieldNamespace}.identifier`,
  });

  const fieldType = useWatch({
    control: hookForm.control,
    name: `${hookFieldNamespace}.type`,
  });

  return (
    <div data-testid="field">
      <FormCard
        label={label || routerField?.label || "Field"}
        moveUp={moveUp}
        moveDown={moveDown}
        badge={
          router ? { text: router.name, variant: "gray", href: `${appUrl}/form-edit/${router.id}` } : null
        }
        deleteField={router ? null : deleteField}>
        <div className="bg-default border-default w-full gap-3 rounded-2xl border p-3">
          <div className="mb-3 w-full">
            <TextField
              data-testid={`${hookFieldNamespace}.label`}
              disabled={!!router}
              label="Label"
              className="flex-grow"
              placeholder={t("this_is_what_your_users_would_see")}
              defaultValue={label || routerField?.label || "Field"}
              required
              {...hookForm.register(`${hookFieldNamespace}.label`)}
              onChange={(e) => {
                hookForm.setValue(`${hookFieldNamespace}.label`, e.target.value, { shouldDirty: true });
              }}
            />
          </div>
          <div className="mb-3 w-full">
            <TextField
              disabled={!!router}
              label="Identifier"
              name={`${hookFieldNamespace}.identifier`}
              required
              placeholder={t("identifies_name_field")}
              value={identifier || routerField?.identifier || label || routerField?.label || ""}
              onChange={(e) => {
                hookForm.setValue(`${hookFieldNamespace}.identifier`, e.target.value, { shouldDirty: true });
              }}
            />
          </div>
          <div className="mb-3 w-full">
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
          {["select", "multiselect"].includes(fieldType) ? (
            <div className="bg-muted w-full rounded-[10px] p-2">
              <MultiOptionInput
                fieldArrayName={`${hookFieldNamespace}.options`}
                disabled={!!router}
                optionPlaceholders={["< 10", "10 - 100", "100 - 500", "> 500"]}
                defaultNumberOfOptions={4}
                pasteDelimiters={["\n", ","]}
                showMoveButtons={true}
                minOptions={1}
                addOptionLabel={t("add_an_option")}
              />
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
    <div className="w-full py-4 lg:py-8">
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
          <Button data-testid="add-field" type="button" StartIcon="plus" color="secondary" onClick={addField}>
            Add field
          </Button>
        </div>
      ) : null}
    </div>
  ) : (
    <div className="w-full py-4 lg:py-8">
      {/* TODO: remake empty screen for V3 */}
      <div className="border-sublt bg-muted flex flex-col items-center gap-6 rounded-xl border p-11">
        <div className="mb-3 grid">
          {/* Icon card - Top */}
          <div className="bg-default border-subtle z-30 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 transform rounded-md border shadow-sm">
            <div className="flex h-full items-center justify-center">
              <Icon name="menu" className="text-emphasis h-4 w-4" />
            </div>
          </div>
          {/* Left fanned card */}
          <div
            className="bg-default border-subtle z-20 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 rounded-md border shadow-sm"
            style={{
              transform: "translate(-12px, 2px) rotate(-6deg)",
            }}
          />
          {/* Right fanned card */}
          <div
            className="bg-default border-subtle z-10 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 rounded-md border shadow-sm"
            style={{
              transform: "translate(12px, 2px) rotate(6deg)",
            }}
          />
        </div>
        <div>
          <h1 className="text-emphasis text-center text-lg font-semibold">Create your first question</h1>
          <p className="mt-2 text-center text-sm leading-normal">
            Fields are the form fields that the booker would see.
          </p>
        </div>
        <Button data-testid="add-field" onClick={addField} StartIcon="plus" className="mt-6">
          Add question
        </Button>
      </div>
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
