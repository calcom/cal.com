import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Button,
  Form,
  SelectField,
  InputField,
  Label,
  Input,
  Dialog,
  ConfirmationDialogContent,
} from "@calcom/ui";

const AttributeSchema = z.object({
  attrName: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]),
  options: z.array(
    z.object({ value: z.string(), id: z.string().optional(), assignedUsers: z.number().optional() })
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

  const form = useForm<FormValues>({
    resolver: zodResolver(AttributeSchema),
    defaultValues: initialValues || {
      attrName: "",
      options: [{ value: "" }],
      type: "TEXT",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const watchedType = form.watch("type");

  return (
    <Form
      form={form}
      className="flex flex-col space-y-4 lg:space-y-6"
      handleSubmit={(values) => {
        onSubmit({
          ...values,
          options: values.options,
        });
      }}>
      {header}
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
            <Label>{t("options")}</Label>
            <div ref={listRef}>
              {fields.map((field, index) => (
                <div className="flex items-center gap-2" key={field.id}>
                  <Input {...form.register(`options.${index}.value`)} className="w-full" />
                  <Input {...form.register(`options.${index}.id`)} className="hidden" />
                  <Button
                    type="button"
                    variant="icon"
                    StartIcon="x"
                    color="minimal"
                    className="mb-2"
                    disabled={index === 0 && fields.length === 1}
                    onClick={() => {
                      if (field.assignedUsers && field.assignedUsers > 0) {
                        setDeleteOptionDialog({ id: index, open: true });
                      } else {
                        remove(index);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <Button type="button" StartIcon="plus" color="secondary" onClick={() => append({ value: "" })}>
            {t("new_option")}
          </Button>
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
              numberOfUsers: fields[deleteOptionDialog.id as number]?.assignedUsers || 0,
            })}
          </>
        </ConfirmationDialogContent>
      </Dialog>
    </Form>
  );
}
