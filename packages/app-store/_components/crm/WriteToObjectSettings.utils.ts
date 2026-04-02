import { CrmFieldType, DateFieldType, WhenToWrite } from "@calcom/app-store/_lib/crm-enums";
import type { SelectOption } from "./WriteToObjectSettings.types";
import { BookingActionEnum } from "./WriteToObjectSettings.types";

export const DATE_FIELD_TYPE = CrmFieldType.DATE;
export const CHECKBOX_FIELD_TYPE = CrmFieldType.CHECKBOX;

export const FIELD_TYPE_LABELS: Record<CrmFieldType, string> = {
  [CrmFieldType.TEXT]: "text",
  [CrmFieldType.STRING]: "text",
  [CrmFieldType.DATE]: "date",
  [CrmFieldType.DATETIME]: "datetime",
  [CrmFieldType.PHONE]: "phone",
  [CrmFieldType.CHECKBOX]: "checkbox",
  [CrmFieldType.PICKLIST]: "picklist",
  [CrmFieldType.CUSTOM]: "custom",
  [CrmFieldType.TEXTAREA]: "textarea",
};

export const DATE_FIELD_LABEL_MAP: Record<DateFieldType, string> = {
  [DateFieldType.BOOKING_CANCEL_DATE]: "booking_cancel_date",
  [DateFieldType.BOOKING_START_DATE]: "booking_start_date",
  [DateFieldType.BOOKING_CREATED_DATE]: "booking_created_date",
};

export const getWhenToWriteLabelMap = (bookingAction: BookingActionEnum): Record<WhenToWrite, string> => ({
  [WhenToWrite.EVERY_BOOKING]:
    bookingAction === BookingActionEnum.ON_CANCEL ? "salesforce_on_every_cancellation" : "on_every_booking",
  [WhenToWrite.FIELD_EMPTY]: "only_if_field_is_empty",
});

export const buildFieldTypeOptions = (
  supportedFieldTypes: readonly CrmFieldType[],
  t: (key: string) => string
): SelectOption<CrmFieldType>[] =>
  supportedFieldTypes.map((type) => ({
    label: t(FIELD_TYPE_LABELS[type]),
    value: type,
  }));

export const buildDateFieldValueOptions = (
  bookingAction: BookingActionEnum,
  supportedDateFields: readonly DateFieldType[] | undefined,
  t: (key: string) => string
): SelectOption<DateFieldType>[] => {
  const defaultDateFields =
    bookingAction === BookingActionEnum.ON_CANCEL
      ? [
          DateFieldType.BOOKING_CANCEL_DATE,
          DateFieldType.BOOKING_START_DATE,
          DateFieldType.BOOKING_CREATED_DATE,
        ]
      : [DateFieldType.BOOKING_START_DATE, DateFieldType.BOOKING_CREATED_DATE];

  const fields = supportedDateFields ?? defaultDateFields;
  return fields.map((type) => ({ label: t(DATE_FIELD_LABEL_MAP[type]), value: type }));
};

export const buildWhenToWriteOptions = (
  supportedWriteTriggers: readonly WhenToWrite[],
  bookingAction: BookingActionEnum,
  t: (key: string) => string
): SelectOption<WhenToWrite>[] => {
  const labelMap = getWhenToWriteLabelMap(bookingAction);
  return supportedWriteTriggers.map((trigger) => ({ label: t(labelMap[trigger]), value: trigger }));
};

export const buildCheckboxFieldValueOptions = (t: (key: string) => string): SelectOption<boolean>[] => [
  { label: t("true"), value: true },
  { label: t("false"), value: false },
];
