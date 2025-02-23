"use client";

import type { UseFormReturn } from "react-hook-form";
import { useFormContext } from "react-hook-form";

import getLocationsOptionsForSelect from "@calcom/features/bookings/lib/getLocationOptionsForSelect";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";
import type { BookingField } from "@calcom/features/form-builder/schema";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import type { RoutingFormWithResponseCount } from "../../components/SingleForm";
import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
} from "../../components/SingleForm";

export { getServerSideProps };
type SelectOption = { label: string; id?: string | null | undefined };
type HookForm = UseFormReturn<RoutingFormWithResponseCount>;

const appendArray = <T,>({
  target,
  arrayToAppend,
  appendAt,
}: {
  arrayToAppend: T[];
  target: T[];
  appendAt: number;
}) => {
  // Avoid mutating the original array
  const copyOfTarget = [...target];
  const numItemsToRemove = arrayToAppend.length;
  copyOfTarget.splice(appendAt, numItemsToRemove, ...arrayToAppend);
  return copyOfTarget;
};

const PASTE_OPTIONS_SEPARATOR_REGEX = /\n+/;

export default function FormEditPage({
  appUrl,
  ...props
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  return (
    <SingleForm
      {...props}
      appUrl={appUrl}
      Page={({ hookForm, form }) => (
        <>
          <FormBuilder
            title={t("booking_questions_title")}
            description={t("booking_questions_description")}
            addFieldLabel={t("add_a_booking_question")}
            formProp="fields"
            dataStore={{
              options: {
                locations: {
                  // FormBuilder doesn't handle plural for non-english languages. So, use english(Location) only. This is similar to 'Workflow'
                  source: { label: "Location" },
                  value: getLocationsOptionsForSelect(formMethods.getValues("locations") ?? [], t),
                },
              },
            }}
            shouldConsiderRequired={(field: BookingField) => {
              // Location field has a default value at backend so API can send no location but we don't allow it in UI and thus we want to show it as required to user
              return field.name === "location" ? true : field.required;
            }}
          />
        </>
      )}
    />
  );
}
