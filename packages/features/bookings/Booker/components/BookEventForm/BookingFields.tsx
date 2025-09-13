import type { LocationObject } from "@calcom/app-store/locations";
import { getOrganizerInputLocationTypes } from "@calcom/app-store/locations";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
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
  bookingData,
}: {
  fields: NonNullable<RouterOutputs["viewer"]["public"]["event"]>["bookingFields"];
  locations: LocationObject[];
  rescheduleUid?: string;
  bookingData?: GetBookingType | null;
  isDynamicGroupBooking: boolean;
}) => {
  const { t } = useLocale();
  const currentView = rescheduleUid ? "reschedule" : "";
  const isInstantMeeting = useBookerStore((state) => state.isInstantMeeting);

  return (
    <div>
      {fields.map((field, index) => {
        // Don't Display Location field in case of instant meeting as only Cal Video is supported
        if (isInstantMeeting && field.name === "location") return null;

        // During reschedule by default all system fields are readOnly. Make them editable on case by case basis.
        const rescheduleReadOnly =
          (field.editable === "system" || field.editable === "system-but-optional") &&
          !!rescheduleUid &&
          bookingData !== null;

        const bookingReadOnly = field.editable === "user-readonly";

        let readOnly = bookingReadOnly || rescheduleReadOnly;
        let hidden = !!field.hidden;

        const fieldViews = field.views;
        if (fieldViews && !fieldViews.find((view) => view.id === currentView)) {
          return null;
        }

        if (field.name === SystemField.Enum.rescheduleReason) {
          if (bookingData === null) {
            return null;
          }
          readOnly = false; // rescheduleReason is editable during reschedule
        }

        // 🚨 Skip duplicate/legacy phone fields (we only want attendeePhoneNumber now)
        if (
          field.name === SystemField.Enum.smsReminderNumber ||
          field.name === SystemField.Enum.aiAgentCallPhoneNumber
        ) {
          return null;
        }

        if (field.name === SystemField.Enum.guests) {
          readOnly = false;
          hidden = isDynamicGroupBooking ? true : !!field.hidden;
        }

        if (field.name === SystemField.Enum.notes && bookingData !== null) {
          return null;
        }

        if (field.name === SystemField.Enum.location) {
          readOnly = false;
        }

        // Dynamically populate location field options
        if (field.name === SystemField.Enum.location && field.type === "radioInput") {
          if (!field.optionsInputs) {
            throw new Error("radioInput must have optionsInputs");
          }
          const optionsInputs = field.optionsInputs;

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

        if (field?.options) {
          const organizerInputTypes = getOrganizerInputLocationTypes();
          const organizerInputObj: Record<string, number> = {};

          field.options.forEach((f) => {
            if (f.value in organizerInputObj) {
              organizerInputObj[f.value]++;
            } else {
              organizerInputObj[f.value] = 1;
            }
          });

          field.options = field.options.map((field) => {
            return {
              ...field,
              value:
                organizerInputTypes.includes(field.value) && organizerInputObj[field.value] > 1
                  ? field.label
                  : field.value,
            };
          });
        }

        return (
          <FormBuilderField className="mb-4" field={{ ...field, hidden }} readOnly={readOnly} key={index} />
        );
      })}
    </div>
  );
};
