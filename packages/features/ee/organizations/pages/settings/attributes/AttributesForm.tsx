import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Form, SelectField, InputField, Label, Input } from "@calcom/ui";

const AttributeSchema = z.object({
  attrName: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]),
  options: z.array(z.object({ value: z.string() })),
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
      className="mt-6 flex flex-col space-y-4 lg:space-y-6"
      handleSubmit={(values) => {
        const uniqueAttributes = new Set(values.options.map((option) => option.value));
        onSubmit({
          ...values,
          options: Array.from(uniqueAttributes).map((value) => ({ value })),
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
                  <Button
                    type="button"
                    variant="icon"
                    StartIcon="x"
                    color="minimal"
                    className="mb-2"
                    disabled={index === 0}
                    onClick={() => remove(index)}
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
    </Form>
  );
}
