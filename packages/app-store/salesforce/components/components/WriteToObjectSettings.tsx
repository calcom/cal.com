import { useState } from "react";
import type z from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Switch } from "@calcom/ui/components/form";
import { InputField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { WhenToWriteToRecord, SalesforceFieldType, DateFieldTypeData } from "../../lib/enums";
import type { writeToRecordEntrySchema, writeToBookingEntry } from "../../zod";

export enum BookingActionEnum {
  ON_BOOKING = "on_booking",
  ON_CANCEL = "on_cancel",
}

type iWriteToObjectData = Record<string, z.infer<typeof writeToBookingEntry>>;

const WriteToObjectSettings = ({
  bookingAction,
  optionLabel,
  optionEnabled,
  optionSwitchOnChange,
  writeToObjectData,
  updateWriteToObjectData,
}: {
  bookingAction: BookingActionEnum;
  optionLabel: string;
  optionEnabled: boolean;
  optionSwitchOnChange: (checked: boolean) => void;
  writeToObjectData: iWriteToObjectData;
  updateWriteToObjectData: (data: iWriteToObjectData) => void;
}) => {
  const { t } = useLocale();

  const fieldTypeOptions = [
    { label: t("text"), value: SalesforceFieldType.TEXT },
    { label: t("date"), value: SalesforceFieldType.DATE },
    { label: t("phone").charAt(0).toUpperCase() + t("phone").slice(1), value: SalesforceFieldType.PHONE },
    { label: t("checkbox"), value: SalesforceFieldType.CHECKBOX },
    { label: t("picklist"), value: SalesforceFieldType.PICKLIST },
    { label: t("custom"), value: SalesforceFieldType.CUSTOM },
  ];

  const whenToWriteToRecordOptions = [
    { label: t("only_if_field_is_empty"), value: WhenToWriteToRecord.FIELD_EMPTY },
    ...(bookingAction === BookingActionEnum.ON_CANCEL
      ? [{ label: t("salesforce_on_every_cancellation"), value: WhenToWriteToRecord.EVERY_BOOKING }]
      : [{ label: t("on_every_booking"), value: WhenToWriteToRecord.EVERY_BOOKING }]),
  ];

  const checkboxFieldValueOptions = [
    { label: t("true"), value: true },
    { label: t("false"), value: false },
  ];

  const dateFieldValueOptions = [
    ...(bookingAction === BookingActionEnum.ON_CANCEL
      ? [{ label: t("booking_cancel_date"), value: DateFieldTypeData.BOOKING_CANCEL_DATE }]
      : []),
    { label: t("booking_start_date"), value: DateFieldTypeData.BOOKING_START_DATE },
    { label: t("booking_created_date"), value: DateFieldTypeData.BOOKING_CREATED_DATE },
  ];

  const [fieldTypeSelectedOption, setFieldTypeSelectedOption] = useState(fieldTypeOptions[0]);
  const [dateFieldSelectedOption, setDateFieldSelectedOption] = useState(dateFieldValueOptions[0]);
  const [checkboxFieldSelectedOption, setCheckboxFieldSelectedOption] = useState(
    checkboxFieldValueOptions[0]
  );
  const [whenToWriteSelectedOption, setWhenToWriteSelectedOption] = useState(whenToWriteToRecordOptions[0]);
  const [newOnWriteToRecordEntry, setNewOnWriteToRecordEntry] = useState<
    z.infer<typeof writeToRecordEntrySchema>
  >({
    field: "",
    fieldType: fieldTypeSelectedOption.value,
    value: "",
    whenToWrite: whenToWriteSelectedOption.value,
  });

  return (
    <>
      <Switch
        label={optionLabel}
        labelOnLeading
        checked={optionEnabled}
        onCheckedChange={optionSwitchOnChange}
      />
      {optionEnabled ? (
        <div className="ml-2 mt-2">
          <div className="grid grid-cols-5 gap-4">
            <div>{t("field_name")}</div>
            <div>{t("field_type")}</div>
            <div>{t("value")}</div>
            <div>{t("when_to_write")}</div>
          </div>
          <div>
            {Object.keys(writeToObjectData).map((key) => (
              <div className="mt-2 grid grid-cols-5 gap-4" key={key}>
                <div>
                  <InputField value={key} readOnly />
                </div>
                <div>
                  <Select
                    value={fieldTypeOptions.find(
                      (option) => option.value === writeToObjectData[key].fieldType
                    )}
                    isDisabled={true}
                  />
                </div>
                <div>
                  {writeToObjectData[key].fieldType === SalesforceFieldType.DATE ? (
                    <Select
                      value={dateFieldValueOptions.find(
                        (option) => option.value === writeToObjectData[key].value
                      )}
                      isDisabled={true}
                    />
                  ) : writeToObjectData[key].fieldType === SalesforceFieldType.CHECKBOX ? (
                    <Select
                      value={checkboxFieldValueOptions.find(
                        (option) => option.value === writeToObjectData[key].value
                      )}
                      isDisabled={true}
                    />
                  ) : (
                    <InputField value={writeToObjectData[key].value as string} readOnly />
                  )}
                </div>
                <div>
                  <Select
                    value={whenToWriteToRecordOptions.find(
                      (option) => option.value === writeToObjectData[key].whenToWrite
                    )}
                    isDisabled={true}
                  />
                </div>
                <div>
                  <Button
                    StartIcon="trash"
                    variant="icon"
                    color="destructive"
                    onClick={() => {
                      const newObject = writeToObjectData;
                      delete writeToObjectData[key];
                      updateWriteToObjectData(newObject);
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-2 grid grid-cols-5 gap-4">
              <div>
                <InputField
                  value={newOnWriteToRecordEntry.field}
                  onChange={(e) =>
                    setNewOnWriteToRecordEntry({
                      ...newOnWriteToRecordEntry,
                      field: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Select
                  options={fieldTypeOptions}
                  value={fieldTypeSelectedOption}
                  onChange={(e) => {
                    if (e) {
                      setFieldTypeSelectedOption(e);
                      setNewOnWriteToRecordEntry({
                        ...newOnWriteToRecordEntry,
                        fieldType: e.value,
                        ...(e.value === SalesforceFieldType.DATE && { value: dateFieldSelectedOption.value }),
                        ...(e.value === SalesforceFieldType.CHECKBOX && {
                          value: checkboxFieldSelectedOption.value,
                        }),
                      });
                    }
                  }}
                />
              </div>
              <div>
                {newOnWriteToRecordEntry.fieldType === SalesforceFieldType.DATE ? (
                  <Select
                    options={dateFieldValueOptions}
                    value={dateFieldSelectedOption}
                    onChange={(e) => {
                      if (e) {
                        setDateFieldSelectedOption(e);
                        setNewOnWriteToRecordEntry({
                          ...newOnWriteToRecordEntry,
                          value: e.value,
                        });
                      }
                    }}
                  />
                ) : newOnWriteToRecordEntry.fieldType === SalesforceFieldType.CHECKBOX ? (
                  <Select
                    options={checkboxFieldValueOptions}
                    value={checkboxFieldSelectedOption}
                    onChange={(e) => {
                      if (e) {
                        setCheckboxFieldSelectedOption(e);
                        setNewOnWriteToRecordEntry({
                          ...newOnWriteToRecordEntry,
                          value: e.value,
                        });
                      }
                    }}
                  />
                ) : (
                  <InputField
                    value={newOnWriteToRecordEntry.value as string}
                    onChange={(e) =>
                      setNewOnWriteToRecordEntry({
                        ...newOnWriteToRecordEntry,
                        value: e.target.value,
                      })
                    }
                  />
                )}
              </div>
              <div>
                <Select
                  options={whenToWriteToRecordOptions}
                  value={whenToWriteSelectedOption}
                  onChange={(e) => {
                    if (e) {
                      setWhenToWriteSelectedOption(e);
                      setNewOnWriteToRecordEntry({
                        ...newOnWriteToRecordEntry,
                        whenToWrite: e.value,
                      });
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <Button
            className="mt-2"
            size="sm"
            disabled={
              !(
                newOnWriteToRecordEntry.field &&
                newOnWriteToRecordEntry.fieldType &&
                newOnWriteToRecordEntry.value !== "" &&
                newOnWriteToRecordEntry.whenToWrite
              )
            }
            onClick={() => {
              if (Object.keys(writeToObjectData).includes(newOnWriteToRecordEntry.field.trim())) {
                showToast("Field already exists", "error");
                return;
              }

              updateWriteToObjectData({
                ...writeToObjectData,
                [newOnWriteToRecordEntry.field.trim()]: {
                  fieldType: newOnWriteToRecordEntry.fieldType,
                  value: newOnWriteToRecordEntry.value,
                  whenToWrite: newOnWriteToRecordEntry.whenToWrite,
                },
              });

              setNewOnWriteToRecordEntry({
                field: "",
                fieldType: fieldTypeOptions[0].value,
                value: "",
                whenToWrite: whenToWriteToRecordOptions[0].value,
              });
            }}>
            {t("add_new_field")}
          </Button>
        </div>
      ) : null}
    </>
  );
};

export default WriteToObjectSettings;
