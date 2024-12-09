"use client";

import { useParams } from "next/navigation";
import React from "react";
import { useFormContext } from "react-hook-form";
import { z } from "zod";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, useMeta, showToast } from "@calcom/ui";

import { AttributeForm } from "./AttributesForm";

const CreateAttributeSchema = z.object({
  // Calling this name would make sense but conflicts with rhf "watch" "name" field
  attrName: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]),
  options: z.array(z.object({ value: z.string(), id: z.string() })),
});

type FormValues = z.infer<typeof CreateAttributeSchema>;

function CreateAttributesPage() {
  const utils = trpc.useUtils();
  const { t } = useLocale();
  // Get the attribute id from the url
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  // ensure string with zod
  const attribute = trpc.viewer.attributes.get.useQuery({ id });

  const mutation = trpc.viewer.attributes.edit.useMutation({
    onSuccess: () => {
      showToast(t("attribute_edited_successfully"), "success");
      utils.viewer.attributes.get.invalidate({
        id,
      });
      utils.viewer.attributes.list.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  return (
    <>
      <LicenseRequired>
        {!attribute.isLoading && attribute.data ? (
          <AttributeForm
            initialValues={{
              attrName: attribute.data.name,
              type: attribute.data.type,
              options: attribute.data.options,
              isLocked: attribute.data.isLocked,
            }}
            header={<EditAttributeHeader isPending={mutation.isPending} />}
            onSubmit={(values) => {
              const { attrName, ...rest } = values;
              mutation.mutate({
                ...rest,
                name: attrName,
                attributeId: id,
              });
            }}
          />
        ) : (
          <>Loading</>
        )}
      </LicenseRequired>
    </>
  );
}

function EditAttributeHeader(props: { isPending: boolean }) {
  const { meta } = useMeta();
  const { t } = useLocale();
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
            <span className="sr-only">{t("back_to_attributes")}</span>
          </Button>
          <div className="font-cal text-cal flex space-x-1 text-xl font-semibold leading-none">
            <h1 className="text-emphasis">{meta.title || t("attribute")}</h1>
            {watchedTitle && (
              <>
                <span className="text-subtle">/</span> <span className="text-emphasis">{watchedTitle}</span>
              </>
            )}
          </div>
        </div>
        <Button type="submit" data-testid="create-attribute-button" loading={props.isPending}>
          {t("save")}
        </Button>
      </div>
    </>
  );
}

export default CreateAttributesPage;
