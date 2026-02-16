"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { getServerSidePropsForSingleFormView as getServerSideProps } from "@calcom/web/lib/apps/routing-forms/[...pages]/getServerSidePropsSingleForm";
import SingleForm from "@components/apps/routing-forms/SingleForm";
import { MenuIcon } from "@coss/ui/icons";
import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { UseFormReturn } from "react-hook-form";
import { Toaster } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { FormBuilder } from "@calcom/web/modules/event-types/components/tabs/advanced/FormBuilder";
import { Button } from "@calcom/ui/components/button";
import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import { useEffect } from "react";

type HookForm = UseFormReturn<RoutingFormWithResponseCount>;

const FormEdit = ({
  hookForm,
  form,
}: {
  hookForm: HookForm;
  form: inferSSRProps<typeof getServerSideProps>["form"];
  appUrl: string;
}) => {
  const { t } = useLocale();

  // Sync internal 'name' field with 'identifier' for Routing Forms
  const fields = hookForm.watch("fields") || [];

  useEffect(() => {
    const subscription = hookForm.watch((value, { name }) => {
      if (name?.startsWith("fields.") && (name.endsWith(".name") || name.endsWith(".identifier"))) {
        const index = parseInt(name.split(".")[1]);
        if (name.endsWith(".name")) {
            const newName = hookForm.getValues(`fields.${index}.name`);
            hookForm.setValue(`fields.${index}.identifier`, newName, { shouldDirty: true });
        } else {
            const newIdentifier = hookForm.getValues(`fields.${index}.identifier`);
            hookForm.setValue(`fields.${index}.name`, newIdentifier, { shouldDirty: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [hookForm]);

  const addField = () => {
    const currentFields = hookForm.getValues("fields") || [];
    hookForm.setValue("fields", [
      ...currentFields,
      {
        id: uuidv4(),
        type: "text",
        label: "",
        identifier: "",
        name: "", // FormBuilder uses 'name'
        required: true,
      },
    ], { shouldDirty: true });
  };

  return fields.length ? (
    <div className="w-full py-4 lg:py-8">
      <FormBuilder
        formProp="fields"
        title={t("questions")}
        description={t("all_info_your_booker_provide")}
        addFieldLabel={t("add_question")}
        disabled={false}
        LockedIcon={false}
        dataStore={{ options: {} }}
      />
    </div>
  ) : (
    <div className="w-full py-4 lg:py-8">
      <div className="border-subtle bg-cal-muted flex flex-col items-center gap-6 rounded-xl border p-11">
        <div className="mb-3 grid">
          <div className="bg-default border-subtle z-30 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 transform rounded-md border shadow-sm">
            <div className="text-emphasis flex h-full items-center justify-center">
              <MenuIcon className="text-emphasis h-4 w-4" />
            </div>
          </div>
          <div
            className="bg-default border-subtle z-20 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 rounded-md border shadow-sm"
            style={{
              transform: "translate(-12px, 2px) rotate(-6deg)",
            }}
          />
          <div
            className="bg-default border-subtle z-10 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 rounded-md border shadow-sm"
            style={{
              transform: "translate(12px, 2px) rotate(6deg)",
            }}
          />
        </div>
        <div>
          <h1 className="text-emphasis text-center text-lg font-semibold">
            {t("create_your_first_question")}
          </h1>
          <p className="text-default mt-2 text-center text-sm leading-normal">
            {t("fields_are_the_form_fields_that_the_booker_would_see")}
          </p>
        </div>
        <Button data-testid="add-field" onClick={addField} StartIcon="plus" className="mt-6">
          {t("add_question")}
        </Button>
      </div>
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
        Page={({ hookForm, form }) => <FormEdit appUrl={appUrl} hookForm={hookForm} form={form} />}
      />
    </>
  );
}
