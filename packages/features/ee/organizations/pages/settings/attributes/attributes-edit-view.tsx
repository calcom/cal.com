"use client";

import { useRouter, useParams } from "next/navigation";
import React from "react";
import { useFormContext } from "react-hook-form";
import { z } from "zod";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import SettingsLayout from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Meta, Button, useMeta, Divider, showToast } from "@calcom/ui";

import { AttributeForm } from "./AttributesForm";

const CreateAttributeSchema = z.object({
  // Calling this name would make sense but conflicts with rhf "watch" "name" field
  attrName: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]),
  options: z.array(z.object({ value: z.string() })),
});

type FormValues = z.infer<typeof CreateAttributeSchema>;

function CreateAttributesPage() {
  const router = useRouter();
  // Get the attribute id from the url
  const { id } = useParams();
  // ensure string with zod
  const attribute = trpc.viewer.attributes.get.useQuery({ id });

  const mutation = trpc.viewer.attributes.edit.useMutation({
    onSuccess: () => {
      showToast("Attribute created successfully", "success");
      router.push("/settings/organizations/attributes");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });
  const { t } = useLocale();

  return (
    <>
      <LicenseRequired>
        <Meta title="Attribute" description="Edit an attribute for your team members" />
        {attribute.isLoading ? (
          <>Loading </>
        ) : (
          <AttributeForm
            initialValues={{
              attrName: attribute.data?.name,
              type: attribute.data?.type,
              options: attribute.data?.options,
            }}
            header={<EditAttributeHeader isPending={mutation.isPending} />}
            onSubmit={(values) => {
              // Create set of attributes to get unique values
              const uniqueAttributes = new Set(values.options.map((option) => option.value));
              mutation.mutate({
                attributeId: id as string,
                name: values.attrName,
                type: values.type,
                options: Array.from(uniqueAttributes).map((value) => ({ value })),
              });
            }}
          />
        )}
      </LicenseRequired>
    </>
  );
}

function EditAttributeHeader(props: { isPending: boolean }) {
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
