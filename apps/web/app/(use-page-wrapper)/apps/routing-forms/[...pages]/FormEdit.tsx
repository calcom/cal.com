"use client";

import { FieldTypes } from "@calcom/app-store/routing-forms/lib/FieldTypes";
import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { fieldTypesConfigMap } from "@calcom/features/form-builder/fieldTypes";
import { getFieldIdentifier } from "@calcom/features/form-builder/utils/getFieldIdentifier";
import type { TNonRouterField } from "@calcom/features/routing-forms/lib/zod";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { CheckboxField, Form, InputField, SelectField } from "@calcom/ui/components/form";
import type { getServerSidePropsForSingleFormView as getServerSideProps } from "@calcom/web/lib/apps/routing-forms/[...pages]/getServerSidePropsSingleForm";
import SingleForm from "@components/apps/routing-forms/SingleForm";
import { ArrowDownIcon, ArrowUpIcon, MenuIcon } from "@coss/ui/icons";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { inferSSRProps } from "@lib/types/inferSSRProps";
import { useState } from "react";
import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Toaster } from "sonner";
import { v4 as uuidv4 } from "uuid";

type HookForm = UseFormReturn<RoutingFormWithResponseCount>;
type RoutingFormField = TNonRouterField & {
  router?: { id: string; name: string; description: string };
  routerField?: TNonRouterField;
};

type FieldDialog = {
  isOpen: boolean;
  fieldIndex: number;
  data: RoutingFormField | null;
};

function Options({
  value,
  onChange,
}: {
  value: { id: string | null; label: string }[];
  onChange: (value: { id: string | null; label: string }[]) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="mt-6">
      <div className="bg-cal-muted rounded-md p-4">
        <div className="flex flex-col gap-3">
          {value?.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="relative grow">
                <input
                  required
                  value={option.label}
                  onChange={(e) => {
                    const newOptions = [...value];
                    newOptions[index] = { id: option.id, label: e.target.value };
                    onChange(newOptions);
                  }}
                  placeholder={`Option ${index + 1}`}
                  className="border-default bg-default text-default placeholder:text-muted focus-visible:ring-brand-default focus:border-emphasis w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
                />
              </div>
              {value.length > 1 && (
                <Button
                  type="button"
                  color="minimal"
                  variant="icon"
                  StartIcon="x"
                  onClick={() => {
                    const newOptions = [...value];
                    newOptions.splice(index, 1);
                    onChange(newOptions);
                  }}
                />
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          color="minimal"
          className="mt-3"
          StartIcon="plus"
          onClick={() => {
            onChange([...(value || []), { id: uuidv4(), label: "" }]);
          }}>
          {t("add_an_option")}
        </Button>
      </div>
    </div>
  );
}

function FieldEditDialog({
  dialog,
  onOpenChange,
  handleSubmit,
  disableTypeChange,
}: {
  dialog: FieldDialog;
  onOpenChange: (isOpen: boolean) => void;
  handleSubmit: SubmitHandler<RoutingFormField>;
  disableTypeChange: boolean;
}) {
  const { t } = useLocale();

  const fieldForm = useForm<RoutingFormField>({
    defaultValues: dialog.data || {
      id: uuidv4(),
      type: "text",
      label: "",
      identifier: "",
      required: false,
    },
  });

  const fieldType = fieldForm.watch("type");
  const fieldTypeConfig = fieldTypesConfigMap[fieldType as keyof typeof fieldTypesConfigMap];
  const needsOptions = fieldTypeConfig?.needsOptions;
  const isTextType = fieldTypeConfig?.isTextType;

  return (
    <Dialog open={dialog.isOpen} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="max-h-none" data-testid="edit-field-dialog" forceOverlayWhenNoModal={true}>
        <Form id="routing-form-field-builder" form={fieldForm} handleSubmit={handleSubmit}>
          <div className="h-auto max-h-[85vh] overflow-y-auto">
            <DialogHeader title={t("add_a_booking_question")} />

            {/* Identifier FIRST — not prefilled */}
            <InputField
              required
              {...fieldForm.register("identifier")}
              containerClassName="mt-6"
              onChange={(e) => {
                fieldForm.setValue("identifier", getFieldIdentifier(e.target.value || "").toLowerCase(), {
                  shouldDirty: true,
                });
              }}
              label={t("identifier")}
              placeholder=""
            />

            <InputField
              required
              {...fieldForm.register("label")}
              containerClassName="mt-6"
              label={t("label")}
            />

            <SelectField
              containerClassName="mt-6"
              label={t("input_type")}
              isDisabled={disableTypeChange}
              options={FieldTypes}
              value={FieldTypes.find((ft) => ft.value === fieldType)}
              onChange={(option) => {
                if (!option) return;
                fieldForm.setValue("type", option.value, { shouldDirty: true });
              }}
            />

            {isTextType && (
              <InputField
                {...fieldForm.register("placeholder")}
                containerClassName="mt-6"
                label={t("placeholder")}
              />
            )}

            {needsOptions && (
              <Controller
                name="options"
                control={fieldForm.control}
                defaultValue={[
                  { id: uuidv4(), label: "" },
                  { id: uuidv4(), label: "" },
                ]}
                render={({ field: { value, onChange } }) => {
                  const opts = (value || []) as { id: string | null; label: string }[];
                  return (
                    <div className="mt-6">
                      <label className="text-default mb-2 block text-sm font-medium">{t("options")}</label>
                      <Options value={opts} onChange={onChange} />
                    </div>
                  );
                }}
              />
            )}

            <div className="mt-6">
              <Controller
                name="required"
                control={fieldForm.control}
                render={({ field: { value, onChange } }) => (
                  <CheckboxField
                    data-testid="field-required"
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                    description={t("make_field_required")}
                  />
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose />
            <Button type="submit" form="routing-form-field-builder" data-testid="field-add-save">
              {dialog.data ? t("save") : t("add")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
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
  const { t } = useLocale();
  const fieldsNamespace = "fields";
  const {
    fields: hookFormFields,
    append: appendHookFormField,
    remove: removeHookFormField,
    swap: swapHookFormField,
    update: updateHookFormField,
  } = useFieldArray({
    control: hookForm.control,
    name: fieldsNamespace,
    keyName: "_id",
  });

  const [animationParent] = useAutoAnimate<HTMLUListElement>();

  const [fieldDialog, setFieldDialog] = useState<FieldDialog>({
    isOpen: false,
    fieldIndex: -1,
    data: null,
  });

  if (!form.fields) {
    form.fields = [];
  }

  const openAddDialog = () => {
    setFieldDialog({ isOpen: true, fieldIndex: -1, data: null });
  };

  const openEditDialog = (index: number, field: RoutingFormField) => {
    setFieldDialog({ isOpen: true, fieldIndex: index, data: field });
  };

  const closeDialog = () => {
    setFieldDialog({ isOpen: false, fieldIndex: -1, data: null });
  };

  const handleFieldSubmit: SubmitHandler<RoutingFormField> = (data) => {
    if (fieldDialog.data) {
      updateHookFormField(fieldDialog.fieldIndex, data as RoutingFormWithResponseCount["fields"][number]);
    } else {
      appendHookFormField({
        ...data,
        id: data.id || uuidv4(),
        type: data.type || "text",
      } as RoutingFormWithResponseCount["fields"][number]);
    }
    closeDialog();
  };

  return (
    <>
      {hookFormFields.length === 0 ? (
        <div className="w-full py-4 lg:py-8">
          <div className="border-subtle bg-cal-muted flex flex-col items-center gap-6 rounded-xl border p-11">
            <div className="mb-3 grid">
              {/* Icon card - Top */}
              <div className="bg-default border-subtle z-30 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 transform rounded-md border shadow-sm">
                <div className="text-emphasis flex h-full items-center justify-center">
                  <MenuIcon className="text-emphasis h-4 w-4" />
                </div>
              </div>
              {/* Left fanned card */}
              <div
                className="bg-default border-subtle z-20 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 rounded-md border shadow-sm"
                style={{ transform: "translate(-12px, 2px) rotate(-6deg)" }}
              />
              {/* Right fanned card */}
              <div
                className="bg-default border-subtle z-10 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 rounded-md border shadow-sm"
                style={{ transform: "translate(12px, 2px) rotate(6deg)" }}
              />
            </div>
            <div>
              <h1 className="text-emphasis text-center text-lg font-semibold">
                {t("create_your_first_question")}
              </h1>
              <p className="text-default mt-2 text-center text-sm leading-normal">
                {t("fields_are_form_fields_that_the_booker_would_see")}
              </p>
            </div>
            <Button data-testid="add-field" onClick={openAddDialog} StartIcon="plus" className="mt-6">
              {t("add_question")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full py-4 lg:py-8">
          <ul ref={animationParent} className="border-subtle divide-subtle divide-y rounded-md border">
            {hookFormFields.map((field, index) => {
              const typedField = field as unknown as RoutingFormField;
              const isRouterField = !!typedField.router;
              const existingField = Boolean((form.fields || []).find((f) => f.id === typedField.id));
              const hasFormResponses = (form._count?.responses ?? 0) > 0;
              const disableTypeChange = existingField && hasFormResponses;
              const fieldTypeConfig =
                fieldTypesConfigMap[typedField.type as keyof typeof fieldTypesConfigMap];
              const typeLabel = fieldTypeConfig?.label ?? typedField.type;

              return (
                <li
                  key={typedField.id}
                  data-testid="field"
                  className="hover:bg-cal-muted group relative flex items-center justify-between p-4 transition">
                  {!isRouterField && (
                    <>
                      {index >= 1 && (
                        <button
                          type="button"
                          className="bg-default text-muted hover:text-emphasis disabled:hover:text-muted border-subtle hover:border-emphasis invisible absolute -left-[12px] -ml-4 -mt-4 mb-4 hidden h-6 w-6 scale-0 items-center justify-center rounded-md border p-1 transition-all hover:shadow disabled:hover:border-inherit disabled:hover:shadow-none group-hover:visible group-hover:scale-100 sm:ml-0 sm:flex"
                          onClick={() => swapHookFormField(index, index - 1)}>
                          <ArrowUpIcon className="h-5 w-5" />
                        </button>
                      )}
                      {index < hookFormFields.length - 1 && (
                        <button
                          type="button"
                          className="bg-default text-muted hover:border-emphasis border-subtle hover:text-emphasis disabled:hover:text-muted invisible absolute -left-[12px] -ml-4 mt-8 hidden h-6 w-6 scale-0 items-center justify-center rounded-md border p-1 transition-all hover:shadow disabled:hover:border-inherit disabled:hover:shadow-none group-hover:visible group-hover:scale-100 sm:ml-0 sm:flex"
                          onClick={() => swapHookFormField(index, index + 1)}>
                          <ArrowDownIcon className="h-5 w-5" />
                        </button>
                      )}
                    </>
                  )}

                  <div>
                    <div className="flex flex-col lg:flex-row lg:items-center">
                      <div className="text-default text-sm font-semibold ltr:mr-2 rtl:ml-2">
                        {typedField.label || typedField.routerField?.label || t("field")}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="grayWithoutHover"
                          data-testid={typedField.required ? "required" : "optional"}>
                          {typedField.required ? t("required") : t("optional")}
                        </Badge>
                        {isRouterField && typedField.router && (
                          <Badge variant="blue">
                            <a href={`${appUrl}/form-edit/${typedField.router.id}`}>
                              {typedField.router.name}
                            </a>
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-subtle pt-1 text-sm">{typeLabel}</p>
                  </div>

                  {!isRouterField && (
                    <div className="flex items-center space-x-2">
                      <Button
                        data-testid="edit-field-action"
                        color="secondary"
                        onClick={() => openEditDialog(index, typedField)}>
                        {t("edit")}
                      </Button>
                      {hookFormFields.length > 1 && (
                        <Button
                          data-testid="delete-field-action"
                          color="destructive"
                          variant="icon"
                          StartIcon="trash-2"
                          onClick={() => removeHookFormField(index)}
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <Button
            data-testid="add-field"
            type="button"
            color="minimal"
            className="mt-4"
            StartIcon="plus"
            onClick={openAddDialog}>
            {t("add_question")}
          </Button>
        </div>
      )}

      {fieldDialog.isOpen && (
        <FieldEditDialog
          dialog={fieldDialog}
          onOpenChange={(isOpen) => {
            if (!isOpen) closeDialog();
          }}
          handleSubmit={handleFieldSubmit}
          disableTypeChange={
            fieldDialog.data
              ? Boolean(
                  (form.fields || []).find((f) => f.id === fieldDialog.data?.id) &&
                    (form._count?.responses ?? 0) > 0
                )
              : false
          }
        />
      )}
    </>
  );
};

export default function FormEditPage({
  appUrl,
  permissions,
  ...props
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <>
      <Toaster position="bottom-right" />
      <SingleForm
        {...props}
        appUrl={appUrl}
        permissions={permissions}
        Page={({ hookForm, form }) => <FormEdit appUrl={appUrl} hookForm={hookForm} form={form} />}
      />
    </>
  );
}
