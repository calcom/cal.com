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
  const allPhoneFields = useMemo(() => {
    const phoneFields = fields.filter((f) => f.type === "phone");
    console.log(
      "📱 [SETUP] All phone fields found:",
      phoneFields.map((f) => ({ name: f.name, hidden: f.hidden }))
    );
    return phoneFields;
  }, [fields]);

  const otherPhoneFieldNames = useMemo(() => {
    const names = allPhoneFields.map((f) => f.name);
    console.log("📱 [SETUP] Phone field names:", names);
    return names;
  }, [allPhoneFields]);

  // Determine if event has Location: Phone option configured
  const hasLocationPhoneOption = useMemo(() => {
    const hasPhone = locations?.some((l) => l?.type === DefaultEventLocationTypeEnum.Phone) ?? false;
    console.log("📱 [SETUP] Has Location Phone option configured:", hasPhone);
    console.log(
      "📱 [SETUP] Available locations:",
      locations?.map((l) => l.type)
    );
    return hasPhone;
  }, [locations]);

  // Decide the primary phone source shown by default:
  // 1) Location phone when configured
  // 2) Workflow default phone (configurable one-liner)
  // 3) attendeePhoneNumber
  // 4) first custom phone
  const primaryPhoneSource = useMemo<{ kind: "location" } | { kind: "field"; name: string } | null>(() => {
    if (hasLocationPhoneOption) {
      console.log("📱 [SETUP] Primary phone source: LOCATION (phone location configured)");
      return { kind: "location" } as const;
    }
    const hasDefaultWorkflow = allPhoneFields.find((f) => f.name === DEFAULT_WORKFLOW_PHONE_FIELD);
    if (hasDefaultWorkflow) {
      console.log(
        "📱 [SETUP] Primary phone source: DEFAULT_WORKFLOW_PHONE_FIELD:",
        DEFAULT_WORKFLOW_PHONE_FIELD
      );
      return { kind: "field", name: hasDefaultWorkflow.name } as const;
    }
    const attendeePhone = allPhoneFields.find((f) => f.name === SystemField.Enum.attendeePhoneNumber);
    if (attendeePhone) {
      console.log("📱 [SETUP] Primary phone source: attendeePhoneNumber");
      return { kind: "field", name: attendeePhone.name } as const;
    }
    if (allPhoneFields.length > 0) {
      console.log("📱 [SETUP] Primary phone source: First custom phone field:", allPhoneFields[0].name);
      return { kind: "field", name: allPhoneFields[0].name } as const;
    }
    console.log("📱 [SETUP] Primary phone source: NONE (no phone fields found)");
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
    console.log("🟢 [MECHANISM #1] syncPhoneFields called with:", locationValue);

    const parsed = PhoneLocationSchema.safeParse(locationValue);
    if (!parsed.success) {
      console.log("🟢 [MECHANISM #1] ❌ Schema validation failed, not a Phone location");
      return;
    }

    const { optionValue } = parsed.data;
    const phone = (optionValue ?? "").trim();
    console.log("🟢 [MECHANISM #1] Extracted phone value:", phone);
    console.log("🟢 [MECHANISM #1] Last synced value:", lastSyncedPhoneRef.current);

    // Skip if empty or same as last sync (avoid redundant updates during typing)
    if (!phone || phone === lastSyncedPhoneRef.current) {
      console.log("🟢 [MECHANISM #1] ⏭️ Skipping (empty or same as last sync)");
      return;
    }

    console.log("🟢 [MECHANISM #1] 🎯 Starting sync to other phone fields...");
    console.log("🟢 [MECHANISM #1] Target fields:", otherPhoneFieldNames);

    // Copy phone to other phone fields (only if user hasn't manually touched them)
    otherPhoneFieldNames.forEach((name) => {
      const targetTouched = !!(formState.touchedFields as TouchedFields)?.responses?.[name];
      console.log(`🟢 [MECHANISM #1] Field "${name}": touched=${targetTouched}`);

      if (!targetTouched) {
        console.log(`🟢 [MECHANISM #1] ✅ Syncing to "${name}": "${phone}"`);
        setValue(`responses.${name}`, phone, {
          shouldDirty: false,
          shouldValidate: false,
        });
      } else {
        console.log(`🟢 [MECHANISM #1] ⏭️ Skipping "${name}" (already touched by user)`);
      }
    });

    lastSyncedPhoneRef.current = phone;
    console.log("🟢 [MECHANISM #1] ✅ Sync complete, updated lastSyncedPhoneRef");
  };

  // First-fill wins: propagate the first non-empty phone value once to all other phone fields that are empty/untouched.
  const firstPropagationDoneRef = useRef(false);
  const allPhoneFieldNames = useMemo(() => allPhoneFields.map((f) => f.name), [allPhoneFields]);
  const phoneWatchKeys = useMemo(() => allPhoneFieldNames.map((n) => `responses.${n}`), [allPhoneFieldNames]);
  const phoneValues = watch(phoneWatchKeys as any) as (string | undefined)[];
  useEffect(() => {
    console.log("🔵 [MECHANISM #2] ========================================");
    console.log("🔵 [MECHANISM #2] First-fill-wins effect triggered");
    console.log("🔵 [MECHANISM #2] firstPropagationDoneRef.current:", firstPropagationDoneRef.current);

    if (firstPropagationDoneRef.current) {
      console.log("🔵 [MECHANISM #2] ❌ Already done, skipping (propagation completed in a previous run)");
      return;
    }

    console.log("🔵 [MECHANISM #2] All phone field names:", allPhoneFieldNames);
    console.log("🔵 [MECHANISM #2] Phone values:", phoneValues);
    console.log("🔵 [MECHANISM #2] Location response:", locationResponse);
    console.log("🔵 [MECHANISM #2] Touched fields:", formState.touchedFields);

    let sourceValue = "";
    let sourceName: string | null = null;

    // If location is Phone and has a value, consider it a source
    if (locationResponse && (locationResponse as any)?.value === DefaultEventLocationTypeEnum.Phone) {
      const locVal = String((locationResponse as any)?.optionValue ?? "").trim();
      console.log("🔵 [MECHANISM #2] Location is Phone type, optionValue:", locVal);
      if (locVal) {
        sourceValue = locVal;
        sourceName = "location";
        console.log("🔵 [MECHANISM #2] ✅ Using location as source:", sourceValue);
      }
    } else {
      console.log("🔵 [MECHANISM #2] Location is NOT Phone type or has no value");
    }

    // Otherwise pick the first non-empty phone field (value alone is sufficient proof of user input)
    if (!sourceValue) {
      console.log("🔵 [MECHANISM #2] No location source, checking phone fields...");
      for (let i = 0; i < allPhoneFieldNames.length; i++) {
        const name = allPhoneFieldNames[i];
        const val = String(phoneValues?.[i] ?? "").trim();
        const touched = !!(formState.touchedFields as TouchedFields)?.responses?.[name];
        console.log(`🔵 [MECHANISM #2] Field "${name}": value="${val}", touched=${touched}`);
        // FIX: Just check for value, not touched status. If field has a value, user must have entered it.
        if (val) {
          sourceValue = val;
          sourceName = name;
          console.log(
            `🔵 [MECHANISM #2] ✅ Using phone field "${name}" as source: "${sourceValue}" (touched=${touched})`
          );
          break;
        }
      }
    }

    if (!sourceValue) {
      console.log("🔵 [MECHANISM #2] ❌ No source value found, will try again on next update");
      // DON'T mark as done - we want to try again when user enters a value
      return;
    }

    console.log(`🔵 [MECHANISM #2] 🎯 Source determined: "${sourceName}" with value: "${sourceValue}"`);
    console.log("🔵 [MECHANISM #2] Starting propagation to other fields...");

    // Propagate to other phone fields that are empty (don't overwrite existing values)
    allPhoneFieldNames.forEach((name, idx) => {
      if (name === sourceName) {
        console.log(`🔵 [MECHANISM #2] Skipping "${name}" (is source)`);
        return;
      }
      const current = String(phoneValues?.[idx] ?? "").trim();
      const touched = !!(formState.touchedFields as TouchedFields)?.responses?.[name];
      console.log(`🔵 [MECHANISM #2] Target "${name}": current="${current}", touched=${touched}`);

      // Only propagate if field is empty (respect any existing value regardless of touched status)
      if (!current) {
        console.log(`🔵 [MECHANISM #2] ✅ Propagating to "${name}": "${sourceValue}"`);
        setValue(`responses.${name}`, sourceValue, { shouldDirty: false, shouldValidate: false });
        // Immediately verify it was set
        const verifyValue = watch(`responses.${name}`);
        console.log(`🔵 [MECHANISM #2]    ↳ Immediate verification: "${name}" = "${verifyValue}"`);
      } else {
        console.log(
          `🔵 [MECHANISM #2] ⏭️ Skipping "${name}" (already has value: "${current}", touched=${touched})`
        );
      }
    });

    // If location is Phone already, set its optionValue as well; do not change location type
    if (locationResponse && (locationResponse as any)?.value === DefaultEventLocationTypeEnum.Phone) {
      const currentLoc = String((locationResponse as any)?.optionValue ?? "").trim();
      console.log("🔵 [MECHANISM #2] Location is Phone, currentLoc:", currentLoc);
      if (!currentLoc) {
        console.log("🔵 [MECHANISM #2] ✅ Setting location optionValue:", sourceValue);
        setValue(
          "responses.location",
          { ...(locationResponse as any), optionValue: sourceValue },
          { shouldDirty: false, shouldValidate: false }
        );
      } else {
        console.log("🔵 [MECHANISM #2] ⏭️ Location already has value, skipping");
      }
    }

    // IMPORTANT: Only mark as done AFTER successful propagation
    firstPropagationDoneRef.current = true;
    console.log("🔵 [MECHANISM #2] ✅✅✅ First-fill propagation COMPLETE, marking as done");

    // Verify the values were actually set - check after a small delay to let setValue complete
    setTimeout(() => {
      console.log("🔵 [MECHANISM #2] 🔍 Verification - Reading back phone field values:");
      allPhoneFieldNames.forEach((name) => {
        const value = watch(`responses.${name}`);
        console.log(`🔵 [MECHANISM #2]   "${name}": "${value}"`);
      });
    }, 100);
  }, [locationResponse, allPhoneFieldNames, phoneValues, formState.touchedFields, setValue, watch]);

  // CONTINUOUS SYNC: If primary phone field has a value, continuously sync to other visible untouched fields
  const primaryPhoneFieldName = primaryPhoneSource?.kind === "field" ? primaryPhoneSource.name : null;
  const primaryPhoneValue = primaryPhoneFieldName ? watch(`responses.${primaryPhoneFieldName}`) : undefined;

  useEffect(() => {
    if (!primaryPhoneFieldName || !primaryPhoneValue) {
      console.log("🟡 [CONTINUOUS SYNC] No primary field or value, skipping");
      return;
    }

    const phone = String(primaryPhoneValue ?? "").trim();
    if (!phone) {
      console.log("🟡 [CONTINUOUS SYNC] Primary field is empty, skipping");
      return;
    }

    console.log(`🟡 [CONTINUOUS SYNC] Primary field "${primaryPhoneFieldName}" has value: "${phone}"`);
    console.log("🟡 [CONTINUOUS SYNC] Syncing to other phone fields...");

    // Sync to other phone fields that are untouched
    otherPhoneFieldNames.forEach((name) => {
      if (name === primaryPhoneFieldName) {
        console.log(`🟡 [CONTINUOUS SYNC] Skipping "${name}" (is primary source)`);
        return;
      }

      const targetTouched = !!(formState.touchedFields as TouchedFields)?.responses?.[name];
      const currentValue = String(watch(`responses.${name}`) ?? "").trim();

      console.log(
        `🟡 [CONTINUOUS SYNC] Target "${name}": current="${currentValue}", touched=${targetTouched}`
      );

      if (!targetTouched) {
        console.log(`🟡 [CONTINUOUS SYNC] ✅ Syncing to "${name}": "${phone}"`);
        setValue(`responses.${name}`, phone, {
          shouldDirty: false,
          shouldValidate: false,
        });
      } else {
        console.log(`🟡 [CONTINUOUS SYNC] ⏭️ Skipping "${name}" (user has touched it)`);
      }
    });
  }, [
    primaryPhoneFieldName,
    primaryPhoneValue,
    otherPhoneFieldNames,
    formState.touchedFields,
    setValue,
    watch,
  ]);

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
