import { useMemo, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { z } from "zod";

import type { LocationObject } from "@calcom/app-store/locations";
import { getOrganizerInputLocationTypes } from "@calcom/app-store/locations";
import { DefaultEventLocationTypeEnum } from "@calcom/app-store/locations";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import getLocationOptionsForSelect from "@calcom/features/bookings/lib/getLocationOptionsForSelect";
import { FormBuilderField } from "@calcom/features/form-builder/FormBuilderField";
import { fieldTypesConfigMap } from "@calcom/features/form-builder/fieldTypes";
import { fieldsThatSupportLabelAsSafeHtml } from "@calcom/features/form-builder/fieldsThatSupportLabelAsSafeHtml";
import { SystemField } from "@calcom/lib/bookings/SystemField";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { RouterOutputs } from "@calcom/trpc/react";

type TouchedFields = {
  responses?: Record<string, boolean>;
};

type Fields = NonNullable<RouterOutputs["viewer"]["public"]["event"]>["bookingFields"];

const PhoneLocationSchema = z.object({
  value: z.literal(DefaultEventLocationTypeEnum.Phone),
  optionValue: z.string().optional(),
});

export const BookingFields = ({
  fields,
  locations,
  rescheduleUid,
  isDynamicGroupBooking,
  bookingData,
  isPaidEvent,
  paymentCurrency = "USD",
}: {
  fields: Fields;
  locations: LocationObject[];
  rescheduleUid?: string;
  bookingData?: GetBookingType | null;
  isDynamicGroupBooking: boolean;
  isPaidEvent?: boolean;
  paymentCurrency?: string;
}) => {
  const { t, i18n } = useLocale();
  const { watch, setValue, formState } = useFormContext();
  const locationResponse = watch("responses.location");
  const currentView = rescheduleUid ? "reschedule" : "";
  const isInstantMeeting = useBookerStore((state) => state.isInstantMeeting);

  /* ======================================================
     ✅ FIX: normalize guest emails (CAL-5091)
     ====================================================== */
  const normalizeGuests = (guests?: string[]) => {
    if (!Array.isArray(guests)) return [];
    return Array.from(
      new Set(
        guests
          .map((g) => g.trim().toLowerCase())
          .filter(Boolean)
      )
    );
  };

  // Identify all phone fields (except location field)
  const otherPhoneFieldNames = useMemo(
    () => fields.filter((f) => f.type === "phone" && f.name !== SystemField.Enum.location).map((f) => f.name),
    [fields]
  );

  const lastSyncedPhoneRef = useRef<string | null>(null);

  const syncPhoneFields = (locationValue: unknown) => {
    const parsed = PhoneLocationSchema.safeParse(locationValue);
    if (!parsed.success) return;

    const phone = (parsed.data.optionValue ?? "").trim();
    if (!phone || phone === lastSyncedPhoneRef.current) return;

    otherPhoneFieldNames.forEach((name) => {
      const targetTouched = !!(formState.touchedFields as TouchedFields)?.responses?.[name];
      if (!targetTouched) {
        setValue(`responses.${name}`, phone, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    });

    lastSyncedPhoneRef.current = phone;
  };

  const getPriceFormattedLabel = (label: string, price: number) =>
    `${label} (${Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: paymentCurrency,
    }).format(price)})`;

  return (
    <div>
      {fields.map((field, index) => {
        if (isInstantMeeting && field.name === "location") return null;

        const rescheduleReadOnly =
          (field.editable === "system" || field.editable === "system-but-optional") &&
          !!rescheduleUid &&
          bookingData !== null;

        const bookingReadOnly = field.editable === "user-readonly";
        let readOnly = bookingReadOnly || rescheduleReadOnly;
        let hidden = !!field.hidden;

        if (field.views && !field.views.find((view) => view.id === currentView)) {
          return null;
        }

        if (field.name === SystemField.Enum.rescheduleReason && bookingData === null) {
          return null;
        }

        if (field.name === SystemField.Enum.smsReminderNumber) {
          if (locationResponse?.value === "phone") {
            setValue(`responses.${SystemField.Enum.smsReminderNumber}`, locationResponse?.optionValue);
            return null;
          }
          readOnly = false;
        }

        /* ======================================================
           ✅ FIX APPLIED HERE — Guests field
           ====================================================== */
        if (field.name === SystemField.Enum.guests) {
          readOnly = false;
          hidden = isDynamicGroupBooking ? true : !!field.hidden;

          const rawGuests = watch(`responses.${SystemField.Enum.guests}`);
          const cleanedGuests = normalizeGuests(rawGuests);

          if (rawGuests && JSON.stringify(rawGuests) !== JSON.stringify(cleanedGuests)) {
            setValue(`responses.${SystemField.Enum.guests}`, cleanedGuests, {
              shouldDirty: true,
              shouldValidate: false,
            });
          }
        }

        if (field.name === SystemField.Enum.notes && bookingData !== null) {
          return null;
        }

        if (field.name === SystemField.Enum.location) {
          readOnly = false;
        }

        if (field.name === SystemField.Enum.location && field.type === "radioInput") {
          if (!field.optionsInputs) {
            throw new Error("radioInput must have optionsInputs");
          }
          const options = getLocationOptionsForSelect(locations, t);
          field.options = options.filter(Boolean);
        }

        let fieldWithPrice = field;
        if (isPaidEvent && fieldTypesConfigMap[field.type]?.supportsPricing && field.label && field.price) {
          const price = typeof field.price === "string" ? parseFloat(field.price) : field.price;
          const label = getPriceFormattedLabel(field.label, price);

          fieldWithPrice = {
            ...field,
            label,
            ...(fieldsThatSupportLabelAsSafeHtml.includes(field.type) && field.labelAsSafeHtml
              ? { labelAsSafeHtml: markdownToSafeHTML(label) }
              : {}),
          };
        }

        return (
          <FormBuilderField
            className="mb-4"
            field={{ ...fieldWithPrice, hidden }}
            readOnly={readOnly}
            key={index}
            {...(field.name === SystemField.Enum.location && {
              onValueChange: ({ value }) => syncPhoneFields(value),
            })}
          />
        );
      })}
    </div>
  );
};
