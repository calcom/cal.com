import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import type { UseFormReturn, FieldArrayWithId } from "react-hook-form";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { InfoBadge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { SettingsToggle, SelectField, Input, InputField, Form, Label } from "@calcom/ui/components/form";

const attributeFormSchema = z.object({
  attrName: z.string().min(1),
  isLocked: z.boolean().optional(),
  isWeightsEnabled: z.boolean().optional(),
  type: z.enum(["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]),
  options: z.array(
    z.object({
      value: z.string(),
      id: z.string().optional(),
      assignedUsers: z.number().optional(),
      isGroup: z.boolean().optional(),
      contains: z.array(z.string()).optional(),
      attributeOptionId: z.string().optional(),
    })
  ),
});

type AttributeFormValues = z.infer<typeof attributeFormSchema>;

const AttributeTypeOptions = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "SINGLE_SELECT", label: "Single Select" },
  { value: "MULTI_SELECT", label: "Multi Select" },
];

interface AttributeFormProps {
  initialValues?: AttributeFormValues;
  onSubmit: (values: AttributeFormValues) => void;
  header: React.ReactNode;
}

export function getGroupOptionUpdate({
  newGroupOptions,
  previousGroupOptions,
  subOption,
  allOptions,
}: {
  newGroupOptions: { label: string; value: string | undefined }[];
  previousGroupOptions: { label: string; value: string | undefined }[];
  subOption: { attributeOptionId?: string };
  allOptions: { attributeOptionId?: string; contains?: string[] }[];
}) {
  const nonGroupOptionId = subOption.attributeOptionId;
  if (!nonGroupOptionId) return {};
  // Find diff b/w previouslyChosenGroupOptions and chosenGroupOptions
  const removedGroupOptions = previousGroupOptions.filter(
    (option) => !newGroupOptions.map((o) => o.value).includes(option.value)
  );

  const optionsUpdate: { [key: number]: string[] } = {};

  // Update all groupOptions' contains as per the final state.
  newGroupOptions
    .filter((option): option is { label: string; value: string } => !!option.value)
    .forEach((newGroupOption) => {
      const { groupOption, index: indexOfGroupOptionInWatchedOptions } = getGroupOptionMatching({
        allOptions,
        toMatchWith: newGroupOption,
      });
      if (!groupOption) return;
      const existingContains = groupOption.contains;
      const newContains = [...(existingContains || []), nonGroupOptionId].filter(
        (value, index, self) => self.indexOf(value) === index
      );
      optionsUpdate[indexOfGroupOptionInWatchedOptions] = newContains;
    });

  // Because certain groupOptions might have been removed, we need to update such groupOptions' contains as well.
  removedGroupOptions
    .filter((option): option is { label: string; value: string } => !!option.value)
    .forEach((removedGroupOption) => {
      const { groupOption, index: indexOfGroupOptionInWatchedOptions } = getGroupOptionMatching({
        allOptions,
        toMatchWith: removedGroupOption,
      });
      if (!groupOption) return;
      const existingContains = groupOption.contains || [];
      const newContains = existingContains.filter((value) => value !== nonGroupOptionId);
      optionsUpdate[indexOfGroupOptionInWatchedOptions] = newContains;
    });
  return optionsUpdate;

  function getGroupOptionMatching({
    allOptions,
    toMatchWith,
  }: {
    allOptions: { attributeOptionId?: string; contains?: string[] }[];
    toMatchWith: { value: string };
  }) {
    const indexOfGroupOptionInWatchedOptions = allOptions.findIndex(
      (option) => option.attributeOptionId === toMatchWith.value
    );
    return {
      index: indexOfGroupOptionInWatchedOptions,
      groupOption:
        (allOptions[indexOfGroupOptionInWatchedOptions] as (typeof allOptions)[number] | undefined) ?? null,
    };
  }
}

type AttributeOption = {
  value: string;
  id?: string;
  assignedUsers?: number;
  isGroup?: boolean;
  contains?: string[];
  attributeOptionId?: string;
};

const NonGroupOption = ({
  option,
  index,
  form,
  removeOption,
  setDeleteOptionDialog,
}: {
  option: AttributeOption;
  index: number;
  form: UseFormReturn<AttributeFormValues>;
  removeOption: (index: number) => void;
  setDeleteOptionDialog: (value: { id: number; open: boolean }) => void;
}) => {
  const { t } = useLocale();
  return (
    <div key={option.id}>
      <div className="flex items-center gap-2" key={option.id}>
        <div className="flex w-full">
          <Input {...form.register(`options.${index}.value`)} placeholder={t("enter_option_value")} />
        </div>
        <Button
          type="button"
          variant="icon"
          StartIcon="x"
          color="minimal"
          className="mb-2"
          disabled={index === 0 && form.getValues("options").length === 1}
          onClick={() => {
            if (option.assignedUsers && option.assignedUsers > 0) {
              setDeleteOptionDialog({ id: index, open: true });
            } else {
              removeOption(index);
            }
          }}
          title={t("remove_option")}
        />
      </div>
      <Input {...form.register(`options.${index}.id`)} className="hidden" />
    </div>
  );
};

const getNonGroupOptionsForSelect = (nonGroupOptions: AttributeOption[]) => {
  return nonGroupOptions
    .map((f) => ({
      label: f.value,
      value: f.attributeOptionId,
    }))
    .filter((option): option is { label: string; value: string } => !!option.value);
};

const getSelectedNonGroupOptions = (option: AttributeOption, nonGroupOptions: AttributeOption[]) => {
  return option.contains
    ?.map((containedId: string) => {
      const nonGroupOption = nonGroupOptions.find((opt) => opt.attributeOptionId === containedId);
      if (!nonGroupOption?.value || !nonGroupOption?.attributeOptionId) return null;
      return {
        label: nonGroupOption.value,
        value: nonGroupOption.attributeOptionId,
      };
    })
    .filter((val): val is { label: string; value: string } => val !== null);
};

const GroupOption = ({
  option,
  index,
  form,
  removeOption,
  setDeleteOptionDialog,
}: {
  option: AttributeOption;
  index: number;
  form: UseFormReturn<AttributeFormValues>;
  removeOption: (index: number) => void;
  setDeleteOptionDialog: (value: { id: number; open: boolean }) => void;
}) => {
  const { t } = useLocale();
  const watchedOptions = form.getValues("options") as AttributeOption[];
  if (!watchedOptions) return null;

  const watchedNonGroupOptions = watchedOptions.filter((field): field is AttributeOption => !field.isGroup);
  if (!watchedNonGroupOptions.length) return null;

  const nonGroupOptionsSelectFieldOptions = getNonGroupOptionsForSelect(watchedNonGroupOptions);
  const nonGroupOptionsSelectFieldSelectedValue = getSelectedNonGroupOptions(option, watchedNonGroupOptions);

  return (
    <div key={option.id}>
      <div className="mb-2 flex items-center gap-2" key={option.id}>
        <div className="flex w-full items-center justify-between gap-2">
          <Input {...form.register(`options.${index}.value`)} className="mb-0! w-36" />
          <SelectField
            isMulti
            placeholder={t("choose_an_option")}
            options={nonGroupOptionsSelectFieldOptions}
            value={nonGroupOptionsSelectFieldSelectedValue}
            onChange={(chosenNonGroupOptions) => {
              const newContains = chosenNonGroupOptions.map((opt) => opt.value);
              form.setValue(`options.${index}.contains`, newContains);
            }}
            containerClassName="w-full"
          />
        </div>
        <Button
          type="button"
          variant="icon"
          StartIcon="x"
          color="minimal"
          className="mb-2"
          disabled={index === 0 && form.getValues("options").length === 1}
          onClick={() => {
            if (option.assignedUsers && option.assignedUsers > 0) {
              setDeleteOptionDialog({ id: index, open: true });
            } else {
              removeOption(index);
            }
          }}
        />
      </div>
      <Input {...form.register(`options.${index}.id`)} className="hidden" />
    </div>
  );
};

const GroupOptions = ({
  fields,
  watchedOptions,
  form,
  removeOption,
  setDeleteOptionDialog,
}: {
  fields: FieldArrayWithId<AttributeFormValues, "options", "id">[];
  watchedOptions: AttributeOption[];
  form: UseFormReturn<AttributeFormValues>;
  removeOption: (index: number) => void;
  setDeleteOptionDialog: (value: { id: number; open: boolean }) => void;
}) => {
  const { t } = useLocale();
  return (
    <>
      <Label className="flex items-center">
        {t("group_options")}
        <InfoBadge content={t("group_options_description")} />
      </Label>
      <div>
        {fields.map((option, index) => {
          const isAGroupOption = option.isGroup;
          if (!isAGroupOption) return null;
          return (
            <GroupOption
              key={option.id}
              option={watchedOptions[index]}
              index={index}
              form={form}
              removeOption={removeOption}
              setDeleteOptionDialog={setDeleteOptionDialog}
            />
          );
        })}
      </div>
    </>
  );
};

export function AttributeForm({ initialValues, onSubmit, header }: AttributeFormProps) {
  const { t } = useLocale();
  const [deleteOptionDialog, setDeleteOptionDialog] = useState<{
    id: number | undefined;
    open: boolean;
  }>({
    id: undefined,
    open: false,
  });

  // Needed because fields returned by useFieldArray have their own id field overriding the id field of the option object.
  const initialValuesEnsuringThatOptionIdIsNotInId = initialValues
    ? {
        ...initialValues,
        options: initialValues.options.map((option) => ({
          ...option,
          // Set attributeOptionId equal to id field because 'id' property is used by useFieldArray
          attributeOptionId: option.id,
          // Also, set id to undefined to make it clear that this id is not used by us.
          id: undefined,
        })),
      }
    : undefined;

  const form = useForm<AttributeFormValues>({
    resolver: zodResolver(attributeFormSchema),
    defaultValues: initialValuesEnsuringThatOptionIdIsNotInId || {
      attrName: "",
      options: [{ value: "", isGroup: false }],
      type: "TEXT",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const removeOption = (index: number) => {
    // Update contains array of any group that has this option
    const optionToRemove = watchedOptions[index];
    if (!optionToRemove.isGroup && optionToRemove.attributeOptionId) {
      const updatedOptions = getUpdatedOptionsAfterRemovingNonGroupOption({
        optionToRemove,
        watchedOptions,
      });
      form.setValue("options", updatedOptions);
    }
    remove(index);
  };

  const getUpdatedOptionsAfterRemovingNonGroupOption = ({
    optionToRemove,
    watchedOptions,
  }: {
    optionToRemove: AttributeOption;
    watchedOptions: AttributeOption[];
  }) => {
    const attributeOptionIdToRemove = optionToRemove.attributeOptionId;
    if (!attributeOptionIdToRemove) return watchedOptions;
    return watchedOptions.map((option) => {
      if (option.isGroup && option.contains) {
        return {
          ...option,
          contains: option.contains.filter((id) => id !== attributeOptionIdToRemove),
        };
      }
      return option;
    });
  };

  const watchedOptions = form.watch("options") as AttributeOption[];
  const watchedType = form.watch("type");
  return (
    <Form
      form={form}
      className="flex flex-col stack-y-4 lg:stack-y-6"
      handleSubmit={(values) => {
        onSubmit({
          ...values,
          options: values.options.map(({ attributeOptionId, ...option }) => ({
            ...option,
            // Set back attributeOptionId in id field
            id: attributeOptionId,
          })),
        });
      }}>
      {header}
      <Controller
        name="isLocked"
        render={({ field: { value, onChange } }) => {
          return (
            <SettingsToggle
              title={t("lock_attribute_for_assignment")}
              description={t("lock_attribute_for_assignment_description")}
              checked={value}
              onCheckedChange={(checked) => {
                onChange(checked);
              }}
            />
          );
        }}
      />
      {["SINGLE_SELECT", "MULTI_SELECT"].includes(watchedType) && (
        <Controller
          name="isWeightsEnabled"
          render={({ field: { value, onChange } }) => {
            return (
              <SettingsToggle
                title={t("attribute_weight_enabled")}
                description={t("attribute_weight_enabled_description")}
                checked={value}
                onCheckedChange={(checked) => {
                  onChange(checked);
                }}
              />
            );
          }}
        />
      )}
      <InputField label={t("name")} required {...form.register("attrName")} />
      <Controller
        name="type"
        render={({ field: { value, onChange } }) => (
          <SelectField
            label="Type"
            options={AttributeTypeOptions}
            onChange={(option) => {
              if (!option) return;
              onChange(option.value);
            }}
            value={AttributeTypeOptions.find((attr) => attr.value === value)}
            required
          />
        )}
      />
      {["SINGLE_SELECT", "MULTI_SELECT"].includes(watchedType) && (
        <div className="bg-cal-muted border-muted mt-6 rounded-lg border p-6">
          <div className="flex flex-col gap-2">
            <div>
              <Label>{t("options")}</Label>
              <div>
                {fields.map((option, index) => {
                  const isAGroupOption = option.isGroup;
                  if (isAGroupOption) return null;
                  return (
                    <NonGroupOption
                      key={option.id}
                      option={watchedOptions[index]}
                      index={index}
                      form={form}
                      removeOption={removeOption}
                      setDeleteOptionDialog={setDeleteOptionDialog}
                    />
                  );
                })}
              </div>
              <Button type="button" StartIcon="plus" color="secondary" onClick={() => append({ value: "" })}>
                {t("new_option")}
              </Button>
            </div>
            <div className="mt-6">
              <GroupOptions
                fields={fields}
                watchedOptions={watchedOptions}
                form={form}
                removeOption={removeOption}
                setDeleteOptionDialog={setDeleteOptionDialog}
              />
              <Button
                type="button"
                StartIcon="plus"
                color="secondary"
                onClick={() => append({ value: "", isGroup: true })}>
                {t("new_group_option")}
              </Button>
            </div>
          </div>
        </div>
      )}
      <Dialog
        open={deleteOptionDialog.open}
        onOpenChange={() => setDeleteOptionDialog({ id: undefined, open: false })}>
        <ConfirmationDialogContent
          title={t("delete_attribute")}
          confirmBtnText={t("delete")}
          onConfirm={() => {
            removeOption(deleteOptionDialog.id as number);
            setDeleteOptionDialog({ id: undefined, open: false });
          }}
          loadingText={t("deleting_attribute")}>
          <>
            {t("delete_attribute_description", {
              numberOfUsers: watchedOptions[deleteOptionDialog.id as number]?.assignedUsers || 0,
            })}
          </>
        </ConfirmationDialogContent>
      </Dialog>
    </Form>
  );
}
