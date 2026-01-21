import type { CrmFieldType, WhenToWrite } from "@calcom/app-store/_lib/crm-enums";

export { CrmFieldType, DateFieldType, WhenToWrite } from "@calcom/app-store/_lib/crm-enums";

export enum BookingActionEnum {
  ON_BOOKING = "on_booking",
  ON_CANCEL = "on_cancel",
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
}

export interface WriteToRecordEntry {
  fieldType: CrmFieldType;
  value: string | boolean;
  whenToWrite: WhenToWrite;
}

export interface WriteToRecordEntrySchema {
  field: string;
  fieldType: CrmFieldType;
  value: string | boolean;
  whenToWrite: WhenToWrite;
}

export interface WriteToObjectSettingsProps {
  bookingAction: BookingActionEnum;
  optionLabel: string;
  optionEnabled: boolean;
  optionSwitchOnChange: (checked: boolean) => void;
  writeToObjectData: Record<string, WriteToRecordEntry>;
  updateWriteToObjectData: (data: Record<string, WriteToRecordEntry>) => void;
  supportedFieldTypes: readonly CrmFieldType[];
  supportedDateFields?: readonly import("@calcom/app-store/_lib/crm-enums").DateFieldType[];
  supportedWriteTriggers?: readonly WhenToWrite[];
}
