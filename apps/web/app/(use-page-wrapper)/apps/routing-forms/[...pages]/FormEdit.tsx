"use client";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import { FormBuilder } from "@calcom/features/form-builder/components/FormBuilder";
import { toFormBuilderField, fromFormBuilderField } from "@calcom/features/form-builder/utils/mapping";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { getServerSidePropsForSingleFormView as getServerSideProps } from "@calcom/web/lib/apps/routing-forms/[...pages]/getServerSidePropsSingleForm";
import SingleForm from "@components/apps/routing-forms/SingleForm";
import type { inferSSRProps } from "@lib/types/inferSSRProps";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Toaster } from "sonner";

type HookForm = UseFormReturn<RoutingFormWithResponseCount>;

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

  useEffect(() => {
    const fields = hookForm.getValues("fields");
    const updatedFields = fields.map((field) => ({
      ...toFormBuilderField(field),
    }));
    hookForm.setValue("fields", updatedFields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full py-4 lg:py-8">
      <FormBuilder
        addFieldLabel={t("add_a_booking_question")}
        title={t("questions")}
        description={t("fields_are_the_form_fields")}
        formProp="fields"
        dataStore={{ options: {} }}
        disabled={false}
        LockedIcon={false}
      />
    </div>
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
        preSubmit={(data) => {
          return {
            ...data,
            fields: data.fields?.map((field: any) => fromFormBuilderField(field)),
          };
        }}
        Page={({ hookForm, form }) => (
          <FormEdit appUrl={appUrl} hookForm={hookForm} form={form} />
        )}
      />
    </>
  );
}
