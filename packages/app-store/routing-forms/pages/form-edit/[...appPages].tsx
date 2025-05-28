"use client";

import { Toaster } from "sonner";

import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import SingleForm from "../../components/SingleForm";
import type { getServerSidePropsForSingleFormView as getServerSideProps } from "../../components/getServerSidePropsSingleForm";

export { getServerSideProps };

export default function FormEditPage({
  appUrl,
  ...props
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  const { t } = useLocale();
  return (
    <>
      <Toaster position="bottom-right" />
      <SingleForm
        {...props}
        appUrl={appUrl}
        Page={() => (
          <FormBuilder
            formProp="fields"
            title={t("routing_form_title")}
            description={t("routing_form_fields_description")}
            addFieldLabel={t("add_a_booking_question")}
            disabled={false}
            LockedIcon={false}
            dataStore={{ options: {} }}
          />
        )}
      />
    </>
  );
}
