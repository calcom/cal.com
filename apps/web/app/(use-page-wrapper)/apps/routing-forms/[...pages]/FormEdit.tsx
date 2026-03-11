"use client";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import { FormBuilder } from "@calcom/web/modules/event-types/components/tabs/advanced/FormBuilder";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import type { getServerSidePropsForSingleFormView as getServerSideProps } from "@calcom/web/lib/apps/routing-forms/[...pages]/getServerSidePropsSingleForm";
import SingleForm from "@components/apps/routing-forms/SingleForm";
import { MenuIcon } from "@coss/ui/icons";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { UseFormReturn } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Toaster } from "sonner";
import { v4 as uuidv4 } from "uuid";

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
  const fieldsNamespace = "fields";
  const {
    fields: hookFormFields,
    append: appendHookFormField,
    remove: removeHookFormField,
    swap: swapHookFormField,
  } = useFieldArray({
    control: hookForm.control,
    name: fieldsNamespace,
    keyName: "_id",
  });

  const [animationRef] = useAutoAnimate<HTMLDivElement>();

  const addField = () => {
    appendHookFormField({
      id: uuidv4(),
      // This is same type from react-awesome-query-builder
      type: "text",
      label: "",
      name: "",
    });
  };

  // hookForm.reset(form);
  if (!form.fields) {
    form.fields = [];
  }

  // Check if fields have responses (to disable type change)
  const hasFormResponses = (form._count?.responses ?? 0) > 0;

  return hookFormFields.length ? (
    <div className="w-full py-4 lg:py-8">
      <div className="border-subtle bg-cal-muted rounded-lg border p-1">
        <div className="p-5">
          <div className="text-default text-sm font-semibold leading-none ltr:mr-1 rtl:ml-1">
            {t("questions")}
          </div>
          <p className="text-subtle wrap-break-word mt-1 max-w-[280px] text-sm sm:max-w-[500px]">
            {t("all_info_your_booker_provide")}
          </p>
        </div>
        <div className="border-subtle bg-default rounded-lg border p-5">
          <FormBuilder
            title={t("questions")}
            description={t("all_info_your_booker_provide")}
            addFieldLabel={t("add_a_question")}
            formProp="fields"
            disabled={false}
            LockedIcon={false}
            dataStore={{
              options: {},
            }}
            shouldConsiderRequired={(field) => field.required}
          />
        </div>
      </div>
      <div className={classNames("flex mt-4")}>
        <Button data-testid="add-field" type="button" StartIcon="plus" color="secondary" onClick={addField}>
          {t("add_a_question")}
        </Button>
      </div>
    </div>
  ) : (
    <div className="w-full py-4 lg:py-8">
      {/* TODO: remake empty screen for V3 */}
      <div className="border-subtle bg-cal-muted flex flex-col items-center gap-6 rounded-xl border p-11">
        <div className="mb-3 grid">
          {/* Icon card - Top */}
          <div className="bg-default border-subtle z-30 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 transform rounded-md border shadow-sm">
            <div className="text-emphasis flex h-full items-center justify-center">
              <MenuIcon className="text-emphasis h-4 w-4" />
            </div>
          </div>
          {/* Left fanned card */}
          <div
            className="bg-default border-subtle z-20 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 rounded-md border shadow-sm"
            style={{
              transform: "translate(-12px, 2px) rotate(-6deg)",
            }}
          />
          {/* Right fanned card */}
          <div
            className="bg-default border-subtle z-10 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 rounded-md border shadow-sm"
            style={{
              transform: "translate(12px, 2px) rotate(6deg)",
            }}
          />
        </div>
        <div>
          <h1 className="text-emphasis text-emphasis text-center text-lg font-semibold">
            {t("create_your_first_question")}
          </h1>
          <p className="text-default mt-2 text-center text-sm leading-normal">
            {t("fields_are_form_fields_that_booker_would_see")}
          </p>
        </div>
        <Button data-testid="add-field" onClick={addField} StartIcon="plus" className="mt-6">
          {t("add_a_question")}
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

