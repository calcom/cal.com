"use client";

import { Toaster } from "sonner";

import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
} from "../../components/SingleForm";

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
          <div className="border-subtle space-y-6 rounded-lg border p-6">
            <FormBuilder
              title={t("booking_questions_title")}
              description={t("booking_questions_description")}
              addFieldLabel={t("add_a_booking_question")}
              formProp="fields"
              disabled={false}
              LockedIcon={false}
              dataStore={{ options: {} }}
            />
          </div>
        )}
      />
    </>
  );
}
