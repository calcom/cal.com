import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";

import type { LocationObject } from "@calcom/app-store/locations";
import getLocationOptionsForSelect from "@calcom/features/bookings/lib/getLocationOptionsForSelect";
import { FormBuilderField } from "@calcom/features/form-builder/FormBuilderField";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";

import { SystemField } from "../../../lib/SystemField";

export const BookingFields = ({
  fields,
  locations,
  rescheduleUid,
  isDynamicGroupBooking,
  currentStep,
}: {
  fields: NonNullable<RouterOutputs["viewer"]["public"]["event"]>["bookingFields"];
  locations: LocationObject[];
  rescheduleUid?: string;
  isDynamicGroupBooking: boolean;
  currentStep: number;
}) => {
  const { t } = useLocale();
  const { watch, setValue } = useFormContext();
  const locationResponse = watch("responses.location");

  const currentView = rescheduleUid ? "reschedule" : "";
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(watch("responses.payment"));
  // Add an effect to update the additional fields when the selected payment method changes
  useEffect(() => {
    setSelectedPaymentMethod(watch("responses.payment"));
  }, [watch("responses.payment")]);
  return (
    // TODO: It might make sense to extract this logic into BookingFields config, that would allow to quickly configure system fields and their editability in fresh booking and reschedule booking view
    // The logic here intends to make modifications to booking fields based on the way we want to specifically show Booking Form
    <div>
      {fields.map((field, index) => {
        // During reschedule by default all system fields are readOnly. Make them editable on case by case basis.
        // Allowing a system field to be edited might require sending emails to attendees, so we need to be careful
        let readOnly =
          (field.editable === "system" || field.editable === "system-but-optional") && !!rescheduleUid;
        let hidden = !!field.hidden;
        const fieldViews = field.views;

        if (fieldViews && !fieldViews.find((view) => view.id === currentView)) {
          return null;
        }

        if (field.name === SystemField.Enum.rescheduleReason) {
          // rescheduleReason is a reschedule specific field and thus should be editable during reschedule
          readOnly = false;
        }

        if (field.name === SystemField.Enum.smsReminderNumber) {
          // `smsReminderNumber` and location.optionValue when location.value===phone are the same data point. We should solve it in a better way in the Form Builder itself.
          // I think we should have a way to connect 2 fields together and have them share the same value in Form Builder
          if (locationResponse?.value === "phone") {
            setValue(`responses.${SystemField.Enum.smsReminderNumber}`, locationResponse?.optionValue);
            // Just don't render the field now, as the value is already connected to attendee phone location
            return null;
          }
          // `smsReminderNumber` can be edited during reschedule even though it's a system field
          readOnly = false;
        }

        if (field.name === SystemField.Enum.guests) {
          readOnly = false;
          // No matter what user configured for Guests field, we don't show it for dynamic group booking as that doesn't support guests
          hidden = isDynamicGroupBooking ? true : !!field.hidden;
        }

        if (selectedPaymentMethod !== "Paypal ID" && field.name === SystemField.Enum.PaypalId) {
          // No matter what user configured for Guests field, we don't show it for dynamic group booking as that doesn't support guests
          hidden = true;
        }
        if (selectedPaymentMethod !== "Bank Details") {
          if (
            field.name === SystemField.Enum.baddress ||
            field.name === SystemField.Enum.bname ||
            field.name === SystemField.Enum.iban ||
            field.name === SystemField.Enum.bcode
          ) {
            hidden = true;
          }
        }
        // We don't show `notes` field during reschedule
        if (field.name === SystemField.Enum.notes && !!rescheduleUid) {
          return null;
        }
        if (field.name === SystemField.Enum.payment && !!rescheduleUid) {
          return null;
        }

        // Dynamically populate location field options
        if (field.name === SystemField.Enum.location && field.type === "radioInput") {
          if (!field.optionsInputs) {
            throw new Error("radioInput must have optionsInputs");
          }
          const optionsInputs = field.optionsInputs;

          // TODO: Instead of `getLocationOptionsForSelect` options should be retrieved from dataStore[field.getOptionsAt]. It would make it agnostic of the `name` of the field.
          const options = getLocationOptionsForSelect(locations, t);
          options.forEach((option) => {
            const optionInput = optionsInputs[option.value as keyof typeof optionsInputs];
            if (optionInput) {
              optionInput.placeholder = option.inputPlaceholder;
            }
          });

          field.options = options.filter(
            (location): location is NonNullable<(typeof options)[number]> => !!location
          );
        }
        // Display fields based on the current step
        if (currentStep === 1) {
          // Display fields for step 1 (connecting details)
          if (
            field.name === "name" ||
            field.name === "email" ||
            field.name === "notes" ||
            field.name === "guests"
          ) {
            return (
              <FormBuilderField
                className="mb-4"
                field={{ ...field, hidden }}
                readOnly={readOnly}
                key={index}
              />
            );
          }
        } else if (currentStep === 2) {
          // Display fields for step 2 (payment details)
          if (
            !(
              field.name === "name" ||
              field.name === "email" ||
              field.name === "notes" ||
              field.name === "guests"
            )
          ) {
            return (
              <FormBuilderField
                className="mb-4"
                field={{ ...field, hidden }}
                readOnly={readOnly}
                key={index}
              />
            );
          }
        }
      })}
    </div>
  );
};
