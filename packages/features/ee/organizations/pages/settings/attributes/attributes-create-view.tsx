"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React from "react";
import { Controller, useForm, useFieldArray, useFormContext } from "react-hook-form";
import { z } from "zod";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import SettingsLayout from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Meta,
  Button,
  useMeta,
  Divider,
  Form,
  SelectField,
  InputField,
  Label,
  Input,
  showToast,
} from "@calcom/ui";

const CreateAttributeSchema = z.object({
  // Calling this name would make sense but conflicts with rhf "watch" "name" field
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
  const router = useRouter();
  const mutation = trpc.viewer.attributes.create.useMutation({
    onSuccess: () => {
      showToast("Attribute created successfully", "success");
      router.push("/settings/organizations/attributes");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const watchedType = form.watch("type");

  return (
    <>
      <LicenseRequired>
        <Meta title="Attribute" description="Create an attribute for your team members" />
        <Form
          form={form}
          className="mt-6 flex flex-col space-y-4 lg:space-y-6"
          handleSubmit={(values) => {
            // Create set of attributes to get unique values
            const uniqueAttributes = new Set(values.options.map((option) => option.value));
            mutation.mutate({
              name: values.attrName,
              type: values.type,
              options: Array.from(uniqueAttributes).map((value) => ({ value })),
            });
          }}>
          <CreateAttributeHeader isPending={mutation.isPending} />
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
                    <>
                      <div className="flex items-center gap-2" key={field.id}>
                        {/* <Icon name="grip-vertical" className="-ml-4 mb-2 hidden h-4 w-4 group-hover:block" /> */}
                        <Input {...form.register(`options.${index}.value`)} className="w-full" />
                        <Button
                          type="button"
                          variant="icon"
                          StartIcon="x"
                          color="minimal"
                          className="mb-2" // input has natural margin bottom already so we need to add to offset
                          disabled={index === 0}
                          onClick={() => remove(index)}
                        />
                      </div>
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

function CreateAttributeHeader(props: { isPending: boolean }) {
  const { meta } = useMeta();
  const formContext = useFormContext<FormValues>();

  const watchedTitle = formContext.watch("attrName");

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
          <div className="font-cal text-cal flex space-x-1 text-xl font-semibold leading-none">
            <h1 className="text-subtle">{meta.title}</h1>
            {watchedTitle && (
              <>
                <span className="text-subtle">/</span> <span className="text-emphasis">{watchedTitle}</span>
              </>
            )}
          </div>
        </div>
        <Button type="submit" data-testid="create-attribute-button" loading={props.isPending}>
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
