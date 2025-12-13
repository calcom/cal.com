"use client";

import { useState } from "react";

import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";
import { TextField, TextAreaField, Select, Label } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { SlotSelectionStep } from "./SlotSelectionStep";

type Step = "details" | "slots" | "success";

interface CreateOneOffMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const durationOptions = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
  { value: 120, label: "2 hours" },
];

export function CreateOneOffMeetingDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateOneOffMeetingDialogProps) {
  const { t } = useLocale();
  const { copyToClipboard, isCopied } = useCopy();
  const utils = trpc.useUtils();

  const [step, setStep] = useState<Step>("details");
  const [title, setTitle] = useState("One-off meeting");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const [selectedSlots, setSelectedSlots] = useState<{ startTime: Date; endTime: Date }[]>([]);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const { data: user } = trpc.viewer.me.useQuery(undefined, { enabled: open });
  const timeZone = user?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const createMutation = trpc.viewer.oneOffMeetings.create.useMutation({
    onSuccess: (data) => {
      const link = `${window.location.origin}${data.bookingLink}`;
      setCreatedLink(link);
      setStep("success");
      copyToClipboard(link);
      showToast(t("link_copied_to_clipboard"), "success");
      utils.viewer.oneOffMeetings.list.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleClose = () => {
    // Reset state
    setStep("details");
    setTitle("One-off meeting");
    setDescription("");
    setDuration(30);
    setSelectedSlots([]);
    setCreatedLink(null);
    onOpenChange(false);
  };

  const handleNext = () => {
    if (step === "details") {
      setStep("slots");
    }
  };

  const handleBack = () => {
    if (step === "slots") {
      setStep("details");
    }
  };

  const handleSlotSelect = (slot: { startTime: Date; endTime: Date }) => {
    setSelectedSlots((prev) => [...prev, slot]);
  };

  const handleSlotRemove = (slotToRemove: { startTime: Date; endTime: Date }) => {
    setSelectedSlots((prev) =>
      prev.filter(
        (slot) =>
          slot.startTime.getTime() !== slotToRemove.startTime.getTime() ||
          slot.endTime.getTime() !== slotToRemove.endTime.getTime()
      )
    );
  };

  const handleCreate = () => {
    createMutation.mutate({
      title,
      description: description || undefined,
      duration,
      timeZone,
      offeredSlots: selectedSlots.map((slot) => ({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
      })),
    });
  };

  const canProceedFromDetails = title.trim().length > 0;
  const canCreateLink = selectedSlots.length > 0;

  const getTitle = () => {
    if (step === "details") return t("create_one_off_meeting");
    if (step === "slots") return t("select_time_slots");
    return t("meeting_link_created");
  };

  const getDescription = () => {
    if (step === "details") return t("create_one_off_meeting_description");
    if (step === "slots") return t("select_times_to_offer");
    return t("share_this_link_with_invitee");
  };

  // Use fullscreen for slot selection step
  const isFullscreen = step === "slots";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        type="creation"
        enableOverflow
        title={getTitle()}
        description={getDescription()}
        className={isFullscreen ? "sm:max-w-[90vw]" : undefined}
        preventCloseOnOutsideClick={isFullscreen}>
        {step === "details" && (
          <div className="mt-4 stack-y-5">
            <TextField
              name="title"
              label={t("title")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("one_off_meeting")}
            />

            <div>
              <Label>{t("duration")}</Label>
              <Select
                options={durationOptions}
                value={durationOptions.find((opt) => opt.value === duration)}
                onChange={(option) => option && setDuration(option.value)}
                menuPlacement="bottom"
              />
            </div>

            <TextAreaField
              name="description"
              label={t("description")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("optional")}
              rows={3}
            />

            <div className="text-subtle text-sm">
              <Icon name="globe" className="mr-1 inline h-4 w-4" />
              {t("timezone")}: {timeZone}
            </div>
          </div>
        )}

        {step === "slots" && (
          <SlotSelectionStep
            duration={duration}
            timeZone={timeZone}
            selectedSlots={selectedSlots}
            onSlotSelect={handleSlotSelect}
            onSlotRemove={handleSlotRemove}
          />
        )}

        {step === "success" && createdLink && (
          <div className="mt-4 flex flex-col items-center justify-center py-6">
            <div className="bg-success/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Icon name="check" className="text-success h-8 w-8" />
            </div>
            <p className="text-emphasis mb-4 text-center text-sm">
              {t("link_ready_to_share")}
            </p>
            <div className="bg-muted w-full max-w-md rounded-lg p-3">
              <code className="text-default break-all text-sm">{createdLink}</code>
            </div>
          </div>
        )}

        <DialogFooter showDivider>
          {step === "slots" && (
            <Button color="minimal" onClick={handleBack}>
              {t("back")}
            </Button>
          )}

          <DialogClose>{step === "success" ? t("done") : t("cancel")}</DialogClose>

          {step === "details" && (
            <Button onClick={handleNext} disabled={!canProceedFromDetails}>
              {t("next")}
            </Button>
          )}

          {step === "slots" && (
            <Button onClick={handleCreate} disabled={!canCreateLink} loading={createMutation.isPending}>
              <Icon name="link" className="mr-2 h-4 w-4" />
              {t("create_link")}
            </Button>
          )}

          {step === "success" && createdLink && (
            <Button onClick={() => copyToClipboard(createdLink)}>
              <Icon name={isCopied ? "check" : "copy"} className="mr-2 h-4 w-4" />
              {isCopied ? t("copied") : t("copy_link")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
