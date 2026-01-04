import type { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { Label, Select, TextArea, TextAreaField } from "@calcom/ui/components/form";

interface InternalNotePresetsSelectProps {
  internalNotePresets: { id: number; name: string; cancellationReason: string | null }[];
  onPresetSelect: (
    option: {
      value: number | string;
      label: string;
    } | null
  ) => void;
}

const InternalNotePresetsSelect = ({
  internalNotePresets,
  onPresetSelect,
}: InternalNotePresetsSelectProps) => {
  const { t } = useLocale();
  const [showOtherInput, setShowOtherInput] = useState(false);

  if (!internalNotePresets?.length) {
    return null;
  }

  const handleSelectChange = (option: { value: number | string; label: string } | null) => {
    if (option?.value === "other") {
      setShowOtherInput(true);
    } else {
      setShowOtherInput(false);
      onPresetSelect?.(option);
    }
  };

  return (
    <div className="mb-4 flex flex-col">
      <Label>{t("internal_booking_note")}</Label>
      <Select
        className="mb-2"
        options={[
          ...internalNotePresets.map((preset) => ({
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

interface RejectionReasonDialogProps {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  onConfirm: (reason: string, internalNote?: { id: number; name: string; cancellationReason?: string | null }) => void;
  isPending?: boolean;
  internalNotePresets?: { id: number; name: string; cancellationReason: string | null }[];
}

export function RejectionReasonDialog({
  isOpenDialog,
  setIsOpenDialog,
  onConfirm,
  isPending = false,
  internalNotePresets = [],
}: RejectionReasonDialogProps) {
  const { t } = useLocale();
  const [rejectionReason, setRejectionReason] = useState("");
  const [internalNote, setInternalNote] = useState<{ id: number; name: string; cancellationReason?: string | null } | null>(null);

  useEffect(() => {
    if (!isOpenDialog) {
      setRejectionReason("");
      setInternalNote(null);
    }
  }, [isOpenDialog]);

  const handleConfirm = () => {
    onConfirm(rejectionReason, internalNote || undefined);
  };

  const handlePresetSelect = (
    option: {
      value: number | string;
      label: string;
    } | null
  ) => {
    if (!option) {
      setInternalNote(null);
      return;
    }

    if (option.value === "other") {
      setInternalNote({ id: -1, name: option.label });
    } else {
      const foundInternalNote = internalNotePresets.find(
        (preset) => preset.id === Number(option.value)
      );
      if (foundInternalNote) {
        setInternalNote(foundInternalNote);
      }
    }
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("rejection_reason_title")} description={t("rejection_reason_description")}>
        <div>
          {internalNotePresets.length > 0 && (
            <InternalNotePresetsSelect
              internalNotePresets={internalNotePresets}
              onPresetSelect={handlePresetSelect}
            />
          )}
          <TextAreaField
            name="rejectionReason"
            label={
              <>
                {t("rejection_reason")}
                <span className="text-subtle font-normal"> ({t("optional")})</span>
              </>
            }
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </div>

        <DialogFooter>
          <DialogClose color="secondary" />
          <Button disabled={isPending} data-testid="rejection-confirm" onClick={handleConfirm}>
            {t("rejection_confirmation")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
