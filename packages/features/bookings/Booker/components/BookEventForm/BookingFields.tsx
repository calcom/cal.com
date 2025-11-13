import { useEffect, useMemo, useRef } from "react";
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
import { DEFAULT_WORKFLOW_PHONE_FIELD } from "@calcom/lib/bookings/SystemField";
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

  // Identify all phone fields (except location field)
  const allPhoneFields = useMemo(() => fields.filter((f) => f.type === "phone"), [fields]);
  const otherPhoneFieldNames = useMemo(() => allPhoneFields.map((f) => f.name), [allPhoneFields]);

  // Determine if event has Location: Phone option configured
  const hasLocationPhoneOption = useMemo(
    () => locations?.some((l) => l?.type === DefaultEventLocationTypeEnum.Phone) ?? false,
    [locations]
  );

  // Decide the primary phone source shown by default:
  // 1) Location phone when configured
  // 2) Workflow default phone (configurable one-liner)
  // 3) attendeePhoneNumber
  // 4) first custom phone
  const primaryPhoneSource = useMemo<{ kind: "location" } | { kind: "field"; name: string } | null>(() => {
    if (hasLocationPhoneOption) return { kind: "location" } as const;
    const hasDefaultWorkflow = allPhoneFields.find((f) => f.name === DEFAULT_WORKFLOW_PHONE_FIELD);
    if (hasDefaultWorkflow) return { kind: "field", name: hasDefaultWorkflow.name } as const;
    const attendeePhone = allPhoneFields.find((f) => f.name === SystemField.Enum.attendeePhoneNumber);
    if (attendeePhone) return { kind: "field", name: attendeePhone.name } as const;
    if (allPhoneFields.length > 0) return { kind: "field", name: allPhoneFields[0].name } as const;
    return null;
  }, [hasLocationPhoneOption, allPhoneFields]);

  // Hosts can explicitly unhide phone fields; respect that intent
  const hostUnhiddenPhoneNames = useMemo(
    () => new Set(allPhoneFields.filter((f) => f.hidden === false).map((f) => f.name)),
    [allPhoneFields]
  );

  // Helper to decide default-hidden for phone fields (unless host unhid)
  const isPhoneHiddenByDefault = (fieldName: string) => {
    if (hostUnhiddenPhoneNames.has(fieldName)) return false;
    if (!primaryPhoneSource) return true;
    if (primaryPhoneSource.kind === "location") return true;
    // primary is a phone field
    return primaryPhoneSource.name !== fieldName;
  };

  // Track last synced value to avoid redundant updates
  const lastSyncedPhoneRef = useRef<string | null>(null);

  // Event-driven sync function
  const syncPhoneFields = (locationValue: unknown) => {
    const parsed = PhoneLocationSchema.safeParse(locationValue);
    if (!parsed.success) return;
    const { optionValue } = parsed.data;
    const phone = (optionValue ?? "").trim();

    // Skip if empty or same as last sync (avoid redundant updates during typing)
    if (!phone || phone === lastSyncedPhoneRef.current) return;

    // Copy phone to other phone fields (only if user hasn't manually touched them)
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

  // First-fill wins: propagate the first non-empty phone value once to all other phone fields that are empty/untouched.
  const firstPropagationDoneRef = useRef(false);
  const allPhoneFieldNames = useMemo(() => allPhoneFields.map((f) => f.name), [allPhoneFields]);
  const phoneWatchKeys = useMemo(() => allPhoneFieldNames.map((n) => `responses.${n}`), [allPhoneFieldNames]);
  const phoneValues = watch(phoneWatchKeys as any) as (string | undefined)[];
  useEffect(() => {
    if (firstPropagationDoneRef.current) return;
    let sourceValue = "";
    let sourceName: string | null = null;
    // If location is Phone and has a value, consider it a source
    if (locationResponse && (locationResponse as any)?.value === DefaultEventLocationTypeEnum.Phone) {
      const locVal = String((locationResponse as any)?.optionValue ?? "").trim();
      if (locVal) {
        sourceValue = locVal;
        sourceName = "location";
      }
    }
    // Otherwise pick the first touched non-empty phone field
    if (!sourceValue) {
      for (let i = 0; i < allPhoneFieldNames.length; i++) {
        const name = allPhoneFieldNames[i];
        const val = String(phoneValues?.[i] ?? "").trim();
        const touched = !!(formState.touchedFields as TouchedFields)?.responses?.[name];
        if (val && touched) {
          sourceValue = val;
          sourceName = name;
          break;
        }
      }
    }
    if (!sourceValue) return;
    // Propagate to other phone fields that are empty and untouched
    allPhoneFieldNames.forEach((name, idx) => {
      if (name === sourceName) return;
      const current = String(phoneValues?.[idx] ?? "").trim();
      const touched = !!(formState.touchedFields as TouchedFields)?.responses?.[name];
      if (!touched && !current) {
        setValue(`responses.${name}`, sourceValue, { shouldDirty: false, shouldValidate: false });
      }
    });
    // If location is Phone already, set its optionValue as well; do not change location type
    if (locationResponse && (locationResponse as any)?.value === DefaultEventLocationTypeEnum.Phone) {
      const currentLoc = String((locationResponse as any)?.optionValue ?? "").trim();
      if (!currentLoc) {
        setValue(
          "responses.location",
          { ...(locationResponse as any), optionValue: sourceValue },
          { shouldDirty: false, shouldValidate: false }
        );
      }
    }
    firstPropagationDoneRef.current = true;
  }, [locationResponse, allPhoneFieldNames, phoneValues, formState.touchedFields, setValue]);

  // Note: Removed primary-phone continuous syncing in favor of first-fill-only propagation.

  // Note: Removed multi-visible bidirectional sync in favor of first-fill-only propagation.

  const getPriceFormattedLabel = (label: string, price: number) =>
    `${label} (${Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: paymentCurrency,
    }).format(price)})`;

  const getFieldWithDirectPricing = (field: Fields[number]) => {
    if (!fieldTypesConfigMap[field.type]?.supportsPricing || !field.label || !field.price) {
      return field;
    }

    const price = typeof field.price === "string" ? parseFloat(field.price) : field.price;
    const label = getPriceFormattedLabel(field.label, price);

    return {
      ...field,
      label,
      ...(fieldsThatSupportLabelAsSafeHtml.includes(field.type) && field.labelAsSafeHtml
        ? { labelAsSafeHtml: markdownToSafeHTML(label) }
        : { labelAsSafeHtml: undefined }),
    };
  };

  const getFieldWithOptionLevelPrices = (field: Fields[number]) => {
    if (!fieldTypesConfigMap[field.type]?.optionsSupportPricing || !field.options) return field;

    return {
      ...field,
      options: field.options.map((opt) => {
        const option = opt as { value: string; label: string; price?: number };
        const optionPrice = option.price;

        // Only add price to label if there's a price
        if (!optionPrice) return option;

        return {
          ...option,
          label: getPriceFormattedLabel(option.label, optionPrice),
        };
      }),
    };
  };

  return (
    // TODO: It might make sense to extract this logic into BookingFields config, that would allow to quickly configure system fields and their editability in fresh booking and reschedule booking view
    // The logic here intends to make modifications to booking fields based on the way we want to specifically show Booking Form
    <div>
      {fields.map((field, index) => {
        // Don't Display Location field in case of instant meeting as only Cal Video is supported
        if (isInstantMeeting && field.name === "location") return null;

        // During reschedule by default all system fields are readOnly. Make them editable on case by case basis.
        // Allowing a system field to be edited might require sending emails to attendees, so we need to be careful
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
          // rescheduleReason is a reschedule specific field and thus should be editable during reschedule
          readOnly = false;
        }

        if (field.name === SystemField.Enum.smsReminderNumber) {
          // `smsReminderNumber` can be edited during reschedule even though it's a system field
          // Value syncing from location phone is handled by effects above, but visibility now fully respects host toggle.
          readOnly = false;
        }

        // Enforce single visible phone field by default; respect host explicit hide/unhide
        if (field.type === "phone") {
          if (field.hidden === true) {
            hidden = true;
          } else if (field.hidden === false) {
            hidden = false;
          } else {
            hidden = isPhoneHiddenByDefault(field.name);
          }
        }

        if (field.name === SystemField.Enum.guests) {
          readOnly = false;
          // No matter what user configured for Guests field, we don't show it for dynamic group booking as that doesn't support guests
          hidden = isDynamicGroupBooking ? true : !!field.hidden;
        }

        // We don't show `notes` field during reschedule but since it's a query param we better valid if rescheduleUid brought any bookingData
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

        // Add price display for custom inputs with prices
        let fieldWithPrice = field;

        if (isPaidEvent) {
          // Handle number fields and boolean (single checkbox) fields
          if (fieldTypesConfigMap[field.type]?.supportsPricing) {
            fieldWithPrice = getFieldWithDirectPricing(field);
          }

          // Handle fields with option-level prices (select, multiselect, and checkbox group)
          if (fieldTypesConfigMap[field.type]?.optionsSupportPricing) {
            fieldWithPrice = getFieldWithOptionLevelPrices(fieldWithPrice);
          }
        }

        return (
          <FormBuilderField
            className="mb-4"
            field={{ ...fieldWithPrice, hidden }}
            readOnly={readOnly}
            key={index}
            {...(field.name === SystemField.Enum.location && {
              onValueChange: ({ value }) => {
                syncPhoneFields(value);
              },
            })}
          />
        );
      })}
    </div>
  );
};
