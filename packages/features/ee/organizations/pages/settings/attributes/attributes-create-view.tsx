"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useCallback } from "react";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import SettingsLayout from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta, Button, useMeta, Divider, Form, SelectField, InputField, Label, Input } from "@calcom/ui";

const CreateAttributeSchema = z.object({
  attrName: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]),
  options: z.array(z.object({ value: z.string() })),
});

type FormValues = z.infer<typeof CreateAttributeSchema>;

const AttributeTypeOptions = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "SINGLE_SELECT", label: "Single Select" },
  { value: "MULTI_SELECT", label: "Multi Select" },
];

function CreateAttributesPage() {
  const { t } = useLocale();
  const [listRef] = useAutoAnimate<HTMLDivElement>({
    duration: 300,
    easing: "ease-in-out",
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateAttributeSchema),
    defaultValues: {
      attrName: "",
      options: [{ value: "" }],
      type: "TEXT",
    },
  });

  const { fields, append, remove, move, replace } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const watchedType = form.watch("type");

  const watchedLastItem = fields.at(-1);

  const handleReorder = useCallback(
    (newOrder: typeof fields) => {
      if (fields.length > 1) {
        replace(newOrder);
      }
    },
    [fields.length, replace]
  );

  return (
    <>
      <LicenseRequired>
        <Meta title="Attribute" description="Create an attribute for your team members" />
        <Form
          form={form}
          className="mt-6 flex flex-col space-y-4 lg:space-y-6"
          handleSubmit={(values) => {
            console.log("submit", values, form.getValues());
            console.log("submit", values);
          }}>
          <CreateAttributeHeader />
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
                <div>
                  {fields.map((field, index) => (
                    <>
                      <div className="flex items-center gap-2" key={field.id}>
                        {/* <Icon name="grip-vertical" className="-ml-4 mb-2 hidden h-4 w-4 group-hover:block" /> */}
                        <Input {...form.register(`options.${index}.value`)} className="w-full" />
                        <Button
                          type="button"
                          variant="icon"
                          StartIcon="x"
                          color="minimal"
                          disabled={index === 0}
                          onClick={() => remove(index)}
                        />
                        {/* Last option cannot be empty error message */}
                      </div>
                      {index === fields.length - 1 && form.formState.errors?.options?.type === "custom" && (
                        <p className="mb-4 text-red-500">{form.formState.errors.options.message}</p>
                      )}
                    </>
                  ))}
                </div>
              </div>
              <Button
                type="button"
                StartIcon="plus"
                color="secondary"
                onClick={() => {
                  return append({ value: "" });
                }}>
                {t("new_option")}
              </Button>
            </div>
          )}
        </Form>
      </LicenseRequired>
    </>
  );
}

function CreateAttributeHeader() {
  const { meta } = useMeta();
  return (
    <>
      <div className="mb-6 mt-6 flex flex-grow items-center justify-between lg:mt-12">
        <div className="-ml-12 flex items-center gap-4">
          <Button
            variant="icon"
            StartIcon="arrow-left"
            color="minimal"
            href="/settings/organizations/attributes">
            <span className="sr-only">Back to Attributes</span>
          </Button>
          <h1 className="font-cal leadning-none text-subtle text-xl font-semibold">{meta.title}</h1>
        </div>
        <Button type="submit" data-testid="create-attribute-button">
          Save
        </Button>
      </div>
      <Divider className="mb-6" />
    </>
  );
}

function getLayout(page: React.ReactElement) {
  return <SettingsLayout hideHeader>{page}</SettingsLayout>;
}

CreateAttributesPage.getLayout = getLayout;

export default CreateAttributesPage;
