"use client";

import { useRouter } from "next/navigation";
import { useFormContext } from "react-hook-form";
import { z } from "zod";

import LicenseRequired from "~/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateAttributesList } from "@calcom/web/app/(use-page-wrapper)/settings/organizations/(org-user-only)/members/actions";

import { AttributeForm } from "./AttributesForm";

const CreateAttributeSchema = z.object({
  // Calling this name would make sense but conflicts with rhf "watch" "name" field
  attrName: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]),
  options: z.array(z.object({ value: z.string(), id: z.string() })),
});

type FormValues = z.infer<typeof CreateAttributeSchema>;

function CreateAttributesPage() {
  const router = useRouter();
  const mutation = trpc.viewer.attributes.create.useMutation({
    onSuccess: () => {
      showToast("Attribute created successfully", "success");
      revalidateAttributesList();
      router.push("/settings/organizations/attributes");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  return (
    <>
      <LicenseRequired>
        <AttributeForm
          header={<CreateAttributeHeader isPending={mutation.isPending} />}
          onSubmit={(values) => {
            const { attrName, ...rest } = values;
            mutation.mutate({
              ...rest,
              name: attrName,
            });
          }}
        />
      </LicenseRequired>
    </>
  );
}

function CreateAttributeHeader(props: { isPending: boolean }) {
  const { t } = useLocale();
  const formContext = useFormContext<FormValues>();

  const watchedTitle = formContext.watch("attrName");

  return (
    <>
      <div className="mb-6 mt-6 flex grow items-center justify-between lg:mt-12">
        <div className="-ml-12 flex items-center gap-4">
          <Button
            variant="icon"
            StartIcon="arrow-left"
            color="minimal"
            href="/settings/organizations/attributes">
            <span className="sr-only">{t("back_to_attributes")}</span>
          </Button>
          <div className="font-cal text-cal flex space-x-1 text-xl font-semibold leading-none">
            <h1 className="text-emphasis">{t("attribute")}</h1>
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
