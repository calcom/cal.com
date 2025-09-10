import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { InputField } from "@calcom/ui/components/form";
import { Section } from "@calcom/ui/components/section";
import { showToast } from "@calcom/ui/components/toast";

export interface FieldMappingInputProps {
  fieldMappings: Record<string, string>;
  onFieldMappingsChange: (mappings: Record<string, string>) => void;
  fieldNamePlaceholder?: string;
  fieldValuePlaceholder?: string;
  fieldNameLabel?: string;
  fieldValueLabel?: string;
  addButtonLabel?: string;
  disabled?: boolean;
}

export const FieldMappingInput = ({
  fieldMappings,
  onFieldMappingsChange,
  fieldNamePlaceholder = "Field name",
  fieldValuePlaceholder = "Value",
  fieldNameLabel,
  fieldValueLabel,
  addButtonLabel,
  disabled = false,
}: FieldMappingInputProps) => {
  const { t } = useLocale();

  const [newField, setNewField] = useState({
    field: "",
    value: "",
  });

  const handleRemoveField = (fieldName: string) => {
    const newMappings = { ...fieldMappings };
    delete newMappings[fieldName];
    onFieldMappingsChange(newMappings);
  };

  const handleAddField = () => {
    if (Object.keys(fieldMappings).includes(newField.field.trim())) {
      showToast("Field already exists", "error");
      return;
    }

    onFieldMappingsChange({
      ...fieldMappings,
      [newField.field.trim()]: newField.value.trim(),
    });
    setNewField({ field: "", value: "" });
  };

  return (
    <Section.SubSectionContent>
      <div className="text-subtle flex gap-3 px-3 py-[6px] text-sm font-medium">
        <div className="flex-1">{fieldNameLabel || t("field_name")}</div>
        <div className="flex-1">{fieldValueLabel || t("value")}</div>
        <div className="w-10" />
      </div>
      <Section.SubSectionNested>
        {Object.keys(fieldMappings).map((key) => (
          <div className="flex items-center gap-2" key={key}>
            <div className="flex-1">
              <InputField value={key} readOnly size="sm" className="w-full" disabled={disabled} />
            </div>
            <div className="flex-1">
              <InputField
                value={fieldMappings[key]}
                readOnly
                size="sm"
                className="w-full"
                disabled={disabled}
              />
            </div>
            <div className="flex w-10 justify-center">
              <Button
                StartIcon="x"
                variant="icon"
                size="sm"
                color="minimal"
                disabled={disabled}
                onClick={() => handleRemoveField(key)}
              />
            </div>
          </div>
        ))}
        <div className="mt-2 flex gap-4">
          <div className="flex-1">
            <InputField
              size="sm"
              className="w-full"
              placeholder={fieldNamePlaceholder}
              value={newField.field}
              disabled={disabled}
              onChange={(e) =>
                setNewField({
                  ...newField,
                  field: e.target.value,
                })
              }
            />
          </div>
          <div className="flex-1">
            <InputField
              size="sm"
              className="w-full"
              placeholder={fieldValuePlaceholder}
              value={newField.value}
              disabled={disabled}
              onChange={(e) =>
                setNewField({
                  ...newField,
                  value: e.target.value,
                })
              }
            />
          </div>
          <div className="w-10" />
        </div>
      </Section.SubSectionNested>
      <Button
        className="text-subtle mt-2 w-fit"
        size="sm"
        color="secondary"
        disabled={disabled || !(newField.field && newField.value)}
        onClick={handleAddField}>
        {addButtonLabel || t("add_new_field")}
      </Button>
    </Section.SubSectionContent>
  );
};
