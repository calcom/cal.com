import { useEffect, useMemo, useRef } from "react";
import { useFormContext } from "react-hook-form";

import type { LocationObject } from "@calcom/app-store/locations";
import { getOrganizerInputLocationTypes } from "@calcom/app-store/locations";
import { DefaultEventLocationTypeEnum } from "@calcom/app-store/locations";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import getLocationOptionsForSelect from "@calcom/features/bookings/lib/getLocationOptionsForSelect";
import { FormBuilderField } from "@calcom/features/form-builder/FormBuilderField";
import { fieldTypesConfigMap } from "@calcom/features/form-builder/fieldTypes";
import { fieldsThatSupportLabelAsSafeHtml } from "@calcom/features/form-builder/fieldsThatSupportLabelAsSafeHtml";
import {
  SystemField,
  DEFAULT_WORKFLOW_PHONE_FIELD,
  CAL_AI_AGENT_PHONE_NUMBER_FIELD,
  SMS_REMINDER_NUMBER_FIELD,
} from "@calcom/lib/bookings/SystemField";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { RouterOutputs } from "@calcom/trpc/react";

type Fields = NonNullable<RouterOutputs["viewer"]["public"]["event"]>["bookingFields"];

const MASTER_SOURCE_TYPE_LOCATION = "location" as const;
const MASTER_SOURCE_TYPE_FIELD = "field" as const;
const FORM_RESPONSES_FIELD = "responses";
const getFormFieldPath = <T extends string>(fieldName: T): `${typeof FORM_RESPONSES_FIELD}.${T}` => {
  return `${FORM_RESPONSES_FIELD}.${fieldName}` as const;
};

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
  const { watch, setValue } = useFormContext();
  const locationResponse = watch(getFormFieldPath(SystemField.Enum.location));
  const currentView = rescheduleUid ? "reschedule" : "";
  const isInstantMeeting = useBookerStore((state) => state.isInstantMeeting);

  // Identify all phone fields
  const allPhoneFields = useMemo(() => {
    const phoneFields = fields.filter((f) => f.type === "phone");
    return phoneFields;
  }, [fields]);

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
    if (hasLocationPhoneOption) {
      return { kind: "location" } as const;
    }
    const hasDefaultWorkflow = allPhoneFields.find((f) => f.name === DEFAULT_WORKFLOW_PHONE_FIELD);
    if (hasDefaultWorkflow) {
      return { kind: "field", name: hasDefaultWorkflow.name } as const;
    }
    const attendeePhone = allPhoneFields.find((f) => f.name === SystemField.Enum.attendeePhoneNumber);
    if (attendeePhone) {
      return { kind: "field", name: attendeePhone.name } as const;
    }
    if (allPhoneFields.length > 0) {
      return { kind: "field", name: allPhoneFields[0].name } as const;
    }
    return null;
  }, [hasLocationPhoneOption, allPhoneFields]);

  // Hosts can explicitly unhide phone fields; respect that intent
  const hostUnhiddenPhoneNames = useMemo(
    () => new Set(allPhoneFields.filter((f) => f.hidden === false).map((f) => f.name)),
    [allPhoneFields]
  );

  const isPhoneHiddenByDefault = (fieldName: string) => {
    if (hostUnhiddenPhoneNames.has(fieldName)) return false;
    if (!primaryPhoneSource) return true;

    // When location is master: only hide system workflow fields (AI Agent, SMS),
    // but keep custom phone fields visible (they were explicitly added by host)
    if (primaryPhoneSource.kind === "location") {
      const isSystemWorkflowField =
        fieldName === CAL_AI_AGENT_PHONE_NUMBER_FIELD || fieldName === SMS_REMINDER_NUMBER_FIELD;
      return isSystemWorkflowField;
    }

    // When a phone field is master: hide all other phone fields except the master
    return primaryPhoneSource.name !== fieldName;
  };

  // === NEW MASTER-SLAVE PHONE AUTOFILL LOGIC ===
  const allPhoneFieldNames = useMemo(() => allPhoneFields.map((f) => f.name), [allPhoneFields]);

  // Define master priority order: Location > AI Agent > SMS Reminder > Custom fields
  const masterPriorityOrder = useMemo(() => {
    const order: Array<{
      type: typeof MASTER_SOURCE_TYPE_LOCATION | typeof MASTER_SOURCE_TYPE_FIELD;
      name: string;
    }> = [];

    // 1. Location phone (only if Phone location is configured)
    if (hasLocationPhoneOption) {
      order.push({ type: MASTER_SOURCE_TYPE_LOCATION, name: SystemField.Enum.location });
    }

    // 2. AI Agent phone
    const aiAgentField = allPhoneFields.find((f) => f.name === CAL_AI_AGENT_PHONE_NUMBER_FIELD);
    if (aiAgentField) {
      order.push({ type: MASTER_SOURCE_TYPE_FIELD, name: CAL_AI_AGENT_PHONE_NUMBER_FIELD });
    }

    // 3. SMS reminder
    const smsField = allPhoneFields.find((f) => f.name === SMS_REMINDER_NUMBER_FIELD);
    if (smsField) {
      order.push({ type: MASTER_SOURCE_TYPE_FIELD, name: SMS_REMINDER_NUMBER_FIELD });
    }

    // 4. Custom phone fields (in order they appear)
    allPhoneFields.forEach((f) => {
      if (f.name !== CAL_AI_AGENT_PHONE_NUMBER_FIELD && f.name !== SMS_REMINDER_NUMBER_FIELD) {
        order.push({ type: MASTER_SOURCE_TYPE_FIELD, name: f.name });
      }
    });

    return order;
  }, [hasLocationPhoneOption, allPhoneFields]);

  const aiAgentPhoneValue = watch(getFormFieldPath(CAL_AI_AGENT_PHONE_NUMBER_FIELD));
  const smsReminderValue = watch(getFormFieldPath(SMS_REMINDER_NUMBER_FIELD));
  const currentMaster = useMemo(() => {
    for (const candidate of masterPriorityOrder) {
      if (candidate.type === MASTER_SOURCE_TYPE_LOCATION) {
        if (locationResponse?.value === DefaultEventLocationTypeEnum.Phone) {
          const phoneValue = String((locationResponse as any)?.optionValue ?? "").trim();
          if (phoneValue) {
            return { source: candidate, value: phoneValue };
          }
        }
      } else {
        let fieldValue = "";
        if (candidate.name === CAL_AI_AGENT_PHONE_NUMBER_FIELD) {
          fieldValue = String(aiAgentPhoneValue ?? "").trim();
        } else if (candidate.name === SMS_REMINDER_NUMBER_FIELD) {
          fieldValue = String(smsReminderValue ?? "").trim();
        } else {
          fieldValue = String(watch(getFormFieldPath(candidate.name)) ?? "").trim();
        }

        if (fieldValue) {
          return { source: candidate, value: fieldValue };
        }
      }
    }
    return null;
  }, [masterPriorityOrder, locationResponse, aiAgentPhoneValue, smsReminderValue]);

  const lastMasterValueRef = useRef<string | null>(null);

  // Single sync effect: Master-to-slaves propagation
  useEffect(() => {
    // Only sync when master value actually changes, not when slave fields change
    const masterValue = currentMaster?.value ?? null;
    if (lastMasterValueRef.current === masterValue) {
      return;
    }
    lastMasterValueRef.current = masterValue;

    // Get all target fields (exclude master from targets)
    const allTargets = allPhoneFieldNames.filter((name) => {
      if (currentMaster?.source.type === MASTER_SOURCE_TYPE_FIELD && currentMaster.source.name === name) {
        return false;
      }
      return true;
    });

    if (currentMaster) {
      allTargets.forEach((targetName) => {
        setValue(getFormFieldPath(targetName), currentMaster.value, {
          shouldDirty: false,
          shouldValidate: false,
        });
      });
    }
  }, [currentMaster, allPhoneFieldNames, setValue]);

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
          />
        );
      })}
    </div>
  );
};
