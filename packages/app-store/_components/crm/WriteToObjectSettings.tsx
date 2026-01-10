import { useState, useMemo } from "react";

import { WhenToWrite } from "@calcom/app-store/_lib/crm-enums";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Switch } from "@calcom/ui/components/form";
import { InputField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { Section } from "@calcom/ui/components/section";
import { showToast } from "@calcom/ui/components/toast";

import type { WriteToRecordEntrySchema, WriteToObjectSettingsProps } from "./WriteToObjectSettings.types";
import {
  DATE_FIELD_TYPE,
  CHECKBOX_FIELD_TYPE,
  buildFieldTypeOptions,
  buildDateFieldValueOptions,
  buildWhenToWriteOptions,
  buildCheckboxFieldValueOptions,
} from "./WriteToObjectSettings.utils";

const WriteToObjectSettings = ({
  bookingAction,
  optionLabel,
  optionEnabled,
  optionSwitchOnChange,
  writeToObjectData,
  updateWriteToObjectData,
  supportedFieldTypes,
  supportedDateFields,
  supportedWriteTriggers = [WhenToWrite.EVERY_BOOKING, WhenToWrite.FIELD_EMPTY],
}: WriteToObjectSettingsProps) => {
  const { t } = useLocale();

  const fieldTypeOptions = useMemo(
    () => buildFieldTypeOptions(supportedFieldTypes, t),
    [supportedFieldTypes, t]
  );

  const dateFieldValueOptions = useMemo(
    () => buildDateFieldValueOptions(bookingAction, supportedDateFields, t),
    [supportedDateFields, bookingAction, t]
  );

  const whenToWriteOptions = useMemo(
    () => buildWhenToWriteOptions(supportedWriteTriggers, bookingAction, t),
    [supportedWriteTriggers, bookingAction, t]
  );

  const showWhenToWriteColumn = whenToWriteOptions.length > 1;

  const checkboxFieldValueOptions = useMemo(() => buildCheckboxFieldValueOptions(t), [t]);

  const [fieldTypeSelectedOption, setFieldTypeSelectedOption] = useState(fieldTypeOptions[0]);
  const [dateFieldSelectedOption, setDateFieldSelectedOption] = useState(dateFieldValueOptions[0]);
  const [checkboxFieldSelectedOption, setCheckboxFieldSelectedOption] = useState(
    checkboxFieldValueOptions[0]
  );
  const [whenToWriteSelectedOption, setWhenToWriteSelectedOption] = useState(whenToWriteOptions[0]);
  const [editingRows, setEditingRows] = useState<Record<string, boolean>>({});
  const [editingData, setEditingData] = useState<Record<string, WriteToRecordEntrySchema>>({});
  const [newOnWriteToRecordEntry, setNewOnWriteToRecordEntry] = useState<WriteToRecordEntrySchema>({
    field: "",
    fieldType: fieldTypeSelectedOption.value,
    value: "",
    whenToWrite: whenToWriteSelectedOption.value,
  });

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
      showToast(t("field_name_cannot_be_empty"), "error");
      return;
    }

    if (editData.field !== key && Object.keys(writeToObjectData).includes(editData.field.trim())) {
      showToast(t("field_already_exists"), "error");
      return;
    }

    const newWriteToObjectData = { ...writeToObjectData };

    if (editData.field !== key) {
      delete newWriteToObjectData[key];
    }

    newWriteToObjectData[editData.field.trim()] = {
      fieldType: editData.fieldType,
      value: editData.value,
      whenToWrite: editData.whenToWrite,
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
          <div className="text-subtle flex gap-3 px-3 py-[6px] text-sm font-medium">
            <div className="flex-1">{t("field_name")}</div>
            <div className="flex-1">{t("field_type")}</div>
            <div className="flex-1">{t("value")}</div>
            {showWhenToWriteColumn && <div className="flex-1">{t("when_to_write")}</div>}
            <div className="w-20" />
          </div>
          <Section.SubSectionNested>
            {Object.keys(writeToObjectData).map((key) => {
              const isEditing = editingRows[key];
              const editData = editingData[key];

              return (
                <div className="flex items-center gap-2" key={key}>
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
                                ...(e.value === DATE_FIELD_TYPE && {
                                  value: dateFieldValueOptions[0].value,
                                }),
                                ...(e.value === CHECKBOX_FIELD_TYPE && {
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
                      editData?.fieldType === DATE_FIELD_TYPE ? (
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
                      ) : editData?.fieldType === CHECKBOX_FIELD_TYPE ? (
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
                    ) : writeToObjectData[key].fieldType === DATE_FIELD_TYPE ? (
                      <Select
                        size="sm"
                        className="w-full"
                        value={dateFieldValueOptions.find(
                          (option) => option.value === writeToObjectData[key].value
                        )}
                        isDisabled={true}
                      />
                    ) : writeToObjectData[key].fieldType === CHECKBOX_FIELD_TYPE ? (
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
                  {showWhenToWriteColumn && (
                    <div className="flex-1">
                      {isEditing ? (
                        <Select
                          size="sm"
                          className="w-full"
                          options={whenToWriteOptions}
                          value={whenToWriteOptions.find((option) => option.value === editData?.whenToWrite)}
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
                          value={whenToWriteOptions.find(
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
              );
            })}
            <div className="flex gap-2">
              <div className="flex-1">
                <InputField
                  size="sm"
                  className="w-full"
                  value={newOnWriteToRecordEntry.field}
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
                        ...(e.value === DATE_FIELD_TYPE && { value: dateFieldSelectedOption.value }),
                        ...(e.value === CHECKBOX_FIELD_TYPE && {
                          value: checkboxFieldSelectedOption.value,
                        }),
                      });
                    }
                  }}
                />
              </div>
              <div className="flex-1">
                {newOnWriteToRecordEntry.fieldType === DATE_FIELD_TYPE ? (
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
                ) : newOnWriteToRecordEntry.fieldType === CHECKBOX_FIELD_TYPE ? (
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
                    onChange={(e) =>
                      setNewOnWriteToRecordEntry({
                        ...newOnWriteToRecordEntry,
                        value: e.target.value,
                      })
                    }
                  />
                )}
              </div>
              {showWhenToWriteColumn && (
                <div className="flex-1">
                  <Select
                    size="sm"
                    className="w-full"
                    options={whenToWriteOptions}
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
              <div className="w-20" />
            </div>
          </Section.SubSectionNested>
          <Button
            className="text-subtle mt-2 w-fit"
            StartIcon="plus"
            color="minimal"
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
                showToast(t("field_already_exists"), "error");
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
                whenToWrite: whenToWriteOptions[0].value,
              });
            }}>
            {t("add_new_field")}
          </Button>
        </Section.SubSectionContent>
      ) : null}
    </>
  );
};

export {
  BookingActionEnum,
  type SelectOption,
  type WriteToRecordEntry,
  type WriteToRecordEntrySchema,
  type WriteToObjectSettingsProps,
} from "./WriteToObjectSettings.types";

export default WriteToObjectSettings;
