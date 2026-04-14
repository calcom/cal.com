import { useLocale } from "@calcom/i18n/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { InputField, Select, Switch } from "@calcom/ui/components/form";
import { Section } from "@calcom/ui/components/section";
import { useState } from "react";
import type z from "zod";
import { DateFieldTypeData, SalesforceFieldType, WhenToWriteToRecord } from "../../lib/enums";
import { validateFieldMapping } from "../../zod";
import type { writeToBookingEntry, writeToRecordEntrySchema } from "../../zod";

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
  hideWhenToWrite = false,
}: {
  bookingAction: BookingActionEnum;
  optionLabel: string;
  optionEnabled: boolean;
  optionSwitchOnChange: (checked: boolean) => void;
  writeToObjectData: iWriteToObjectData;
  updateWriteToObjectData: (data: iWriteToObjectData) => void;
  /** Hide the "when to write" column (e.g., for event creation where fields are always empty) */
  hideWhenToWrite?: boolean;
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
  const [editingRows, setEditingRows] = useState<Record<string, boolean>>({});
  const [editingData, setEditingData] = useState<Record<string, z.infer<typeof writeToRecordEntrySchema>>>(
    {}
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string | null>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newOnWriteToRecordEntry, setNewOnWriteToRecordEntry] = useState<
    z.infer<typeof writeToRecordEntrySchema>
  >({
    field: "",
    fieldType: fieldTypeSelectedOption.value,
    value: "",
    whenToWrite: hideWhenToWrite ? WhenToWriteToRecord.EVERY_BOOKING : whenToWriteSelectedOption.value,
  });

  const resetNewEntry = () => {
    setNewOnWriteToRecordEntry({
      field: "",
      fieldType: fieldTypeOptions[0].value,
      value: "",
      whenToWrite: hideWhenToWrite ? WhenToWriteToRecord.EVERY_BOOKING : whenToWriteToRecordOptions[0].value,
    });
    setFieldTypeSelectedOption(fieldTypeOptions[0]);
    setDateFieldSelectedOption(dateFieldValueOptions[0]);
    setCheckboxFieldSelectedOption(checkboxFieldValueOptions[0]);
    setWhenToWriteSelectedOption(whenToWriteToRecordOptions[0]);
    setValidationError(null);
  };

  const saveNewEntry = () => {
    if (Object.keys(writeToObjectData).includes(newOnWriteToRecordEntry.field.trim())) {
      setValidationError("Field already exists");
      return;
    }

    const fieldError = validateFieldMapping(newOnWriteToRecordEntry);
    if (fieldError) {
      setValidationError(fieldError);
      return;
    }
    setValidationError(null);

    updateWriteToObjectData({
      ...writeToObjectData,
      [newOnWriteToRecordEntry.field.trim()]: {
        fieldType: newOnWriteToRecordEntry.fieldType,
        value: newOnWriteToRecordEntry.value,
        whenToWrite: hideWhenToWrite
          ? WhenToWriteToRecord.EVERY_BOOKING
          : newOnWriteToRecordEntry.whenToWrite,
      },
    });

    resetNewEntry();
    setIsAddingNew(false);
  };

  const cancelNewEntry = () => {
    resetNewEntry();
    setIsAddingNew(false);
  };

  const startEditing = (key: string) => {
    Object.keys(editingRows).forEach((rowKey) => {
      if (editingRows[rowKey] && rowKey !== key) {
        cancelEditing(rowKey);
      }
    });
    setEditingRows((prev) => ({ ...prev, [key]: true }));
    setEditingData((prev) => ({
      ...prev,
      [key]: {
        field: key,
        fieldType: writeToObjectData[key].fieldType,
        value: writeToObjectData[key].value,
        whenToWrite: writeToObjectData[key].whenToWrite,
      },
    }));
  };

  const cancelEditing = (key: string) => {
    setEditingRows((prev) => ({ ...prev, [key]: false }));
    setEditingData((prev) => {
      const newData = { ...prev };
      delete newData[key];
      return newData;
    });
  };

  const saveEditing = (key: string) => {
    const editData = editingData[key];
    if (!editData) return;

    if (!editData.field.trim()) {
      setEditValidationErrors((prev) => ({ ...prev, [key]: "Field name cannot be empty" }));
      return;
    }

    if (editData.field !== key && Object.keys(writeToObjectData).includes(editData.field.trim())) {
      setEditValidationErrors((prev) => ({ ...prev, [key]: "Field already exists" }));
      return;
    }

    const fieldError = validateFieldMapping(editData);
    if (fieldError) {
      setEditValidationErrors((prev) => ({ ...prev, [key]: fieldError }));
      return;
    }
    setEditValidationErrors((prev) => ({ ...prev, [key]: null }));

    const newWriteToObjectData = { ...writeToObjectData };

    if (editData.field !== key) {
      delete newWriteToObjectData[key];
    }

    newWriteToObjectData[editData.field.trim()] = {
      fieldType: editData.fieldType,
      value: editData.value,
      whenToWrite: hideWhenToWrite ? WhenToWriteToRecord.EVERY_BOOKING : editData.whenToWrite,
    };

    updateWriteToObjectData(newWriteToObjectData);
    cancelEditing(key);
  };

  return (
    <>
      <Section.SubSectionHeader icon="star" labelFor="write-to-object-settings" title={optionLabel}>
        <Switch
          checked={optionEnabled}
          onCheckedChange={optionSwitchOnChange}
          id="write-to-object-settings"
          size="sm"
        />
      </Section.SubSectionHeader>

      {optionEnabled ? (
        <Section.SubSectionContent>
          {(Object.keys(writeToObjectData).length > 0 || isAddingNew) && (
            <>
              <div className="text-subtle flex gap-3 px-3 py-[6px] text-sm font-medium">
                <div className="flex-1">{t("field_name")}</div>
                <div className="flex-1">{t("field_type")}</div>
                <div className="flex-1">{t("value")}</div>
                {!hideWhenToWrite && <div className="flex-1">{t("when_to_write")}</div>}
                <div className="w-20" />
              </div>
              <Section.SubSectionNested>
            {Object.keys(writeToObjectData).map((key) => {
              const isEditing = editingRows[key];
              const editData = editingData[key];

              return (
                <div key={key}>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    {isEditing ? (
                      <InputField
                        value={editData?.field || key}
                        onChange={(e) =>
                          setEditingData((prev) => ({
                            ...prev,
                            [key]: { ...editData, field: e.target.value },
                          }))
                        }
                        size="sm"
                        className="w-full"
                      />
                    ) : (
                      <InputField value={key} readOnly size="sm" className="w-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <Select
                        size="sm"
                        className="w-full"
                        options={fieldTypeOptions}
                        value={fieldTypeOptions.find((option) => option.value === editData?.fieldType)}
                        onChange={(e) => {
                          if (e) {
                            setEditingData((prev) => ({
                              ...prev,
                              [key]: {
                                ...editData,
                                fieldType: e.value,
                                ...(e.value === SalesforceFieldType.DATE && {
                                  value: dateFieldValueOptions[0].value,
                                }),
                                ...(e.value === SalesforceFieldType.CHECKBOX && {
                                  value: checkboxFieldValueOptions[0].value,
                                }),
                              },
                            }));
                          }
                        }}
                      />
                    ) : (
                      <Select
                        size="sm"
                        className="w-full"
                        value={fieldTypeOptions.find(
                          (option) => option.value === writeToObjectData[key].fieldType
                        )}
                        isDisabled={true}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      editData?.fieldType === SalesforceFieldType.DATE ? (
                        <Select
                          size="sm"
                          className="w-full"
                          options={dateFieldValueOptions}
                          value={dateFieldValueOptions.find((option) => option.value === editData.value)}
                          onChange={(e) => {
                            if (e) {
                              setEditingData((prev) => ({
                                ...prev,
                                [key]: { ...editData, value: e.value },
                              }));
                            }
                          }}
                        />
                      ) : editData?.fieldType === SalesforceFieldType.CHECKBOX ? (
                        <Select
                          size="sm"
                          className="w-full"
                          options={checkboxFieldValueOptions}
                          value={checkboxFieldValueOptions.find((option) => option.value === editData.value)}
                          onChange={(e) => {
                            if (e) {
                              setEditingData((prev) => ({
                                ...prev,
                                [key]: { ...editData, value: e.value },
                              }));
                            }
                          }}
                        />
                      ) : (
                        <InputField
                          value={(editData?.value as string) || ""}
                          onChange={(e) =>
                            setEditingData((prev) => ({
                              ...prev,
                              [key]: { ...editData, value: e.target.value },
                            }))
                          }
                          size="sm"
                          className="w-full"
                        />
                      )
                    ) : writeToObjectData[key].fieldType === SalesforceFieldType.DATE ? (
                      <Select
                        size="sm"
                        className="w-full"
                        value={dateFieldValueOptions.find(
                          (option) => option.value === writeToObjectData[key].value
                        )}
                        isDisabled={true}
                      />
                    ) : writeToObjectData[key].fieldType === SalesforceFieldType.CHECKBOX ? (
                      <Select
                        size="sm"
                        className="w-full"
                        value={checkboxFieldValueOptions.find(
                          (option) => option.value === writeToObjectData[key].value
                        )}
                        isDisabled={true}
                      />
                    ) : (
                      <InputField
                        value={writeToObjectData[key].value as string}
                        readOnly
                        size="sm"
                        className="w-full"
                      />
                    )}
                  </div>
                  {!hideWhenToWrite && (
                    <div className="flex-1">
                      {isEditing ? (
                        <Select
                          size="sm"
                          className="w-full"
                          options={whenToWriteToRecordOptions}
                          value={whenToWriteToRecordOptions.find(
                            (option) => option.value === editData?.whenToWrite
                          )}
                          onChange={(e) => {
                            if (e) {
                              setEditingData((prev) => ({
                                ...prev,
                                [key]: { ...editData, whenToWrite: e.value },
                              }));
                            }
                          }}
                        />
                      ) : (
                        <Select
                          size="sm"
                          className="w-full"
                          value={whenToWriteToRecordOptions.find(
                            (option) => option.value === writeToObjectData[key].whenToWrite
                          )}
                          isDisabled={true}
                        />
                      )}
                    </div>
                  )}
                  <div className="flex w-20 justify-center gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          StartIcon="check"
                          variant="icon"
                          color="primary"
                          onClick={() => saveEditing(key)}
                        />
                        <Button
                          size="sm"
                          StartIcon="x"
                          variant="icon"
                          color="secondary"
                          onClick={() => cancelEditing(key)}
                        />
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          StartIcon="pencil"
                          variant="icon"
                          color="minimal"
                          onClick={() => startEditing(key)}
                        />
                        <Button
                          size="sm"
                          StartIcon="x"
                          variant="icon"
                          color="minimal"
                          onClick={() => {
                            const newObject = { ...writeToObjectData };
                            delete newObject[key];
                            updateWriteToObjectData(newObject);
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
                {isEditing && editValidationErrors[key] && (
                  <Alert severity="error" className="mt-1" message={editValidationErrors[key]} />
                )}
              </div>
              );
            })}
            {isAddingNew && (
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <InputField
                      size="sm"
                      className="w-full"
                      value={newOnWriteToRecordEntry.field}
                      placeholder={t("field_name")}
                      onChange={(e) =>
                        setNewOnWriteToRecordEntry({
                          ...newOnWriteToRecordEntry,
                          field: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Select
                      size="sm"
                      className="w-full"
                      options={fieldTypeOptions}
                      value={fieldTypeSelectedOption}
                      onChange={(e) => {
                        if (e) {
                          setFieldTypeSelectedOption(e);
                          setNewOnWriteToRecordEntry({
                            ...newOnWriteToRecordEntry,
                            fieldType: e.value,
                            ...(e.value === SalesforceFieldType.DATE && {
                              value: dateFieldSelectedOption.value,
                            }),
                            ...(e.value === SalesforceFieldType.CHECKBOX && {
                              value: checkboxFieldSelectedOption.value,
                            }),
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    {newOnWriteToRecordEntry.fieldType === SalesforceFieldType.DATE ? (
                      <Select
                        size="sm"
                        className="w-full"
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
                        size="sm"
                        className="w-full"
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
                        size="sm"
                        className="w-full"
                        value={newOnWriteToRecordEntry.value as string}
                        placeholder={t("value")}
                        onChange={(e) =>
                          setNewOnWriteToRecordEntry({
                            ...newOnWriteToRecordEntry,
                            value: e.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                  {!hideWhenToWrite && (
                    <div className="flex-1">
                      <Select
                        size="sm"
                        className="w-full"
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
                  )}
                  <div className="flex w-20 justify-center gap-1">
                    <Button
                      size="sm"
                      StartIcon="check"
                      variant="icon"
                      color="primary"
                      disabled={
                        !(
                          newOnWriteToRecordEntry.field &&
                          newOnWriteToRecordEntry.fieldType &&
                          newOnWriteToRecordEntry.value !== "" &&
                          newOnWriteToRecordEntry.whenToWrite
                        )
                      }
                      onClick={saveNewEntry}
                    />
                    <Button
                      size="sm"
                      StartIcon="x"
                      variant="icon"
                      color="secondary"
                      onClick={cancelNewEntry}
                    />
                  </div>
                </div>
                {validationError && (
                  <Alert severity="error" className="mt-1" message={validationError} />
                )}
              </div>
            )}
              </Section.SubSectionNested>
            </>
          )}
          {!isAddingNew && (
            <Button
              className="text-subtle mt-2 w-fit"
              StartIcon="plus"
              color="minimal"
              size="sm"
              onClick={() => {
                resetNewEntry();
                setIsAddingNew(true);
              }}>
              {t("add_new_field")}
            </Button>
          )}
        </Section.SubSectionContent>
      ) : null}
    </>
  );
};

export default WriteToObjectSettings;
