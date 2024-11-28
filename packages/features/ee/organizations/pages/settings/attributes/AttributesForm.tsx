import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { entries } from "@calcom/prisma/zod-utils";
import {
  Button,
  Form,
  SelectField,
  InputField,
  Label,
  Input,
  Dialog,
  ConfirmationDialogContent,
  SettingsToggle,
} from "@calcom/ui";

const AttributeSchema = z.object({
  attrName: z.string().min(1),
  isLocked: z.boolean().optional(),
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

type FormValues = z.infer<typeof AttributeSchema>;

const AttributeTypeOptions = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "SINGLE_SELECT", label: "Single Select" },
  { value: "MULTI_SELECT", label: "Multi Select" },
];

interface AttributeFormProps {
  initialValues?: FormValues;
  onSubmit: (values: FormValues) => void;
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
  newGroupOptions.forEach((newGroupOption) => {
    const indexOfGroupOptionInWatchedOptions = allOptions.findIndex(
      (groupOption) => groupOption.attributeOptionId === newGroupOption.value
    );
    const existingContains = allOptions[indexOfGroupOptionInWatchedOptions].contains;
    const newContains = [...(existingContains || []), nonGroupOptionId].filter(
      (value, index, self) => self.indexOf(value) === index
    );
    optionsUpdate[indexOfGroupOptionInWatchedOptions] = newContains;
  });

  // Because certain groupOptions might have been removed, we need to update such groupOptions' contains as well.
  removedGroupOptions.forEach((removedGroupOption) => {
    const indexOfGroupOptionInWatchedOptions = allOptions.findIndex(
      (groupOption) => groupOption.attributeOptionId === removedGroupOption.value
    );
    const existingContains = allOptions[indexOfGroupOptionInWatchedOptions].contains || [];
    const newContains = existingContains.filter((value) => value !== nonGroupOptionId);
    optionsUpdate[indexOfGroupOptionInWatchedOptions] = newContains;
  });
  return optionsUpdate;
}

export function AttributeForm({ initialValues, onSubmit, header }: AttributeFormProps) {
  const { t } = useLocale();
  const [deleteOptionDialog, setDeleteOptionDialog] = useState<{
    id: number | undefined;
    open: boolean;
  }>({
    id: undefined,
    open: false,
  });
  const [listRef] = useAutoAnimate<HTMLDivElement>({
    duration: 300,
    easing: "ease-in-out",
  });

  // Needed because useFieldArray overrides the id field
  const initialValuesEnsuringThatOptionIdIsNotInId = initialValues
    ? {
        ...initialValues,
        options: initialValues.options.map((option) => ({
          ...option,
          id: undefined,
          attributeOptionId: option.id,
        })),
      }
    : undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(AttributeSchema),
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

  const watchedOptions = form.watch("options");
  const watchedGroupOptions = watchedOptions.filter((field) => field.isGroup);
  const watchedType = form.watch("type");
  return (
    <Form
      form={form}
      className="flex flex-col space-y-4 lg:space-y-6"
      handleSubmit={(values) => {
        onSubmit({
          ...values,
          options: values.options.map((option) => ({
            ...option,
            id: option.attributeOptionId,
          })),
        });
      }}>
      {header}
      <Controller
        name="isLocked"
        render={({ field: { value, onChange } }) => {
          return (
            <SettingsToggle
              title={t("Lock for assignment")}
              description={t("Lock for assignment of options from cal.com. Supposed to be updated by SCIM")}
              checked={value}
              onCheckedChange={(checked) => {
                onChange(checked);
              }}
            />
          );
        }}
      />
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
        <div className="bg-muted border-muted mt-6 rounded-lg border p-6">
          <div className="flex flex-col gap-2">
            <div>
              <Label>{t("options")}</Label>
              <div ref={listRef}>
                {watchedOptions.map((nonGroupOption, index) => {
                  const isAGroupOption = nonGroupOption.isGroup;
                  if (isAGroupOption) return null;
                  const groupSelectValue = watchedGroupOptions
                    ?.filter(
                      ({ contains }) =>
                        nonGroupOption.attributeOptionId &&
                        contains?.includes(nonGroupOption.attributeOptionId)
                    )
                    .map((groupOption) => ({
                      label: groupOption.value,
                      value: groupOption.attributeOptionId,
                    }));
                  return (
                    <>
                      <div className="flex items-center gap-2" key={nonGroupOption.id}>
                        <div className="flex w-full justify-between gap-2">
                          <Input {...form.register(`options.${index}.value`)} />
                          <SelectField
                            isMulti
                            placeholder="Select Group"
                            options={watchedGroupOptions.map((f) => ({
                              label: f.value,
                              value: f.attributeOptionId,
                            }))}
                            value={groupSelectValue}
                            onChange={(chosenGroupOptions) => {
                              const optionsUpdate = getGroupOptionUpdate({
                                newGroupOptions: chosenGroupOptions as { label: string; value: string }[],
                                previousGroupOptions: groupSelectValue,
                                subOption: nonGroupOption,
                                allOptions: watchedOptions,
                              });
                              entries(optionsUpdate).forEach(([index, value]) => {
                                form.setValue(`options.${index}.contains`, value);
                              });
                            }}
                            className="min-w-64"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="icon"
                          StartIcon="x"
                          color="minimal"
                          className="mb-2"
                          disabled={index === 0 && fields.length === 1}
                          onClick={() => {
                            if (nonGroupOption.assignedUsers && nonGroupOption.assignedUsers > 0) {
                              setDeleteOptionDialog({ id: index, open: true });
                            } else {
                              remove(index);
                            }
                          }}
                        />
                      </div>
                      <Input {...form.register(`options.${index}.id`)} className="hidden" />
                    </>
                  );
                })}
              </div>
              <Button type="button" StartIcon="plus" color="secondary" onClick={() => append({ value: "" })}>
                {t("new_option")}
              </Button>
            </div>
            <div className="mt-6">
              <Label>{t("Group Options")}</Label>
              <div ref={listRef}>
                {watchedOptions.map((watchedOption, index) => {
                  const isAGroupOption = watchedOption.isGroup;
                  if (!isAGroupOption) return null;
                  return (
                    <>
                      <div className="flex items-center gap-2" key={watchedOption.id}>
                        <div className="flex w-full">
                          <Input {...form.register(`options.${index}.value`)} className="w-full" />
                        </div>
                        <Button
                          type="button"
                          variant="icon"
                          StartIcon="x"
                          color="minimal"
                          className="mb-2"
                          disabled={index === 0 && fields.length === 1}
                          onClick={() => {
                            if (watchedOption.assignedUsers && watchedOption.assignedUsers > 0) {
                              setDeleteOptionDialog({ id: index, open: true });
                            } else {
                              remove(index);
                            }
                          }}
                        />
                      </div>
                      <Input {...form.register(`options.${index}.id`)} className="hidden" />
                    </>
                  );
                })}
              </div>
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
            remove(deleteOptionDialog.id as number);
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
