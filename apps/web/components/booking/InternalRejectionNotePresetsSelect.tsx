"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label, Select, TextArea } from "@calcom/ui/components/form";

interface InternalRejectionNotePresetsSelectProps {
  internalNotePresets: { id: number; name: string; rejectionReason?: string | null }[];
  onPresetSelect: (
    option: {
      value: number | string;
      label: string;
    } | null
  ) => void;
  setRejectionReason: (reason: string) => void;
}

const InternalRejectionNotePresetsSelect = ({
  internalNotePresets,
  onPresetSelect,
  setRejectionReason,
}: InternalRejectionNotePresetsSelectProps) => {
  const { t } = useLocale();
  const [showOtherInput, setShowOtherInput] = useState(false);

  if (!internalNotePresets?.length) {
    return null;
  }

  const rejectionPresets = internalNotePresets.filter((preset) => preset.rejectionReason);

  if (!rejectionPresets.length) {
    return null;
  }

  const handleSelectChange = (option: { value: number | string; label: string } | null) => {
    if (option?.value === "other") {
      setShowOtherInput(true);
      setRejectionReason("");
    } else {
      setShowOtherInput(false);
      onPresetSelect && onPresetSelect(option);
    }
  };

  return (
    <div className="mb-4 flex flex-col">
      <Label>{t("internal_booking_note")}</Label>
      <Select
        className="mb-2"
        options={[
          ...rejectionPresets?.map((preset) => ({
            label: preset.name,
            value: preset.id,
          })),
          { label: t("other"), value: "other" },
        ]}
        onChange={handleSelectChange}
        placeholder={t("internal_booking_note")}
      />
      {showOtherInput && (
        <TextArea
          rows={3}
          placeholder={t("internal_booking_note_description")}
          onChange={(e) => onPresetSelect?.({ value: "other", label: e.target.value })}
        />
      )}
    </div>
  );
};

export default InternalRejectionNotePresetsSelect;
