"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@coss/ui/components/button";
import { Textarea } from "@coss/ui/components/textarea";
import { toastManager } from "@coss/ui/components/toast";
import { cn } from "@coss/ui/lib/utils";
import { XIcon } from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";
import { RATING_OPTIONS } from "../../bookings/lib/rating";

export interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
  surveyId: string;
  ratingQuestionId: string;
  commentQuestionId: string;
  titleKey?: string;
  descriptionKey?: string;
}

/**
 * Bottom-right positioned feedback dialog.
 * Uses z-index 10000 to stay below Intercom (which uses very high z-indexes).
 */
export function FeedbackDialog({
  isOpen,
  onClose,
  onSubmitSuccess,
  surveyId,
  ratingQuestionId,
  commentQuestionId,
  titleKey = "feedback_dialog_title",
  descriptionKey = "feedback_dialog_description",
}: FeedbackDialogProps): ReactElement {
  const { t } = useLocale();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const submitFeedbackMutation = trpc.viewer.feedback.submitFeedback.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
      onSubmitSuccess?.();
    },
    onError: () => {
      toastManager.add({ title: t("error_submitting_feedback"), type: "error" });
    },
  });

  const handleSubmit = async (): Promise<void> => {
    if (selectedRating === null) return;

    await submitFeedbackMutation.mutateAsync({
      surveyId,
      data: {
        [ratingQuestionId]: selectedRating,
        [commentQuestionId]: comment,
      },
    });
  };

  const handleSkip = (): void => {
    resetAndClose();
  };

  const resetAndClose = (): void => {
    setSelectedRating(null);
    setComment("");
    setIsSuccess(false);
    onClose();
  };

  const dialogContent = isSuccess ? (
    <>
      <div className="flex flex-col gap-2 p-6 pb-4">
        <DialogPrimitive.Title className="font-heading font-semibold text-xl leading-none">
          {t("feedback_submitted_title")}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="text-muted-foreground text-sm">
          {t("feedback_submitted_description")}
        </DialogPrimitive.Description>
      </div>
      <div className="flex justify-end gap-2 border-t bg-muted/72 px-6 py-4">
        <Button onClick={resetAndClose}>{t("done")}</Button>
      </div>
    </>
  ) : (
    <>
      <div className="flex flex-col gap-2 p-6 pb-3">
        <DialogPrimitive.Title className="font-heading font-semibold text-xl leading-none">
          {t(titleKey)}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="text-muted-foreground text-sm">
          {t(descriptionKey)}
        </DialogPrimitive.Description>
      </div>
      <div className="space-y-4 px-6 pb-4">
        <div className="flex justify-center gap-2">
          {RATING_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedRating(option.value)}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg text-2xl transition-all",
                selectedRating === option.value ? "bg-emphasis" : "hover:bg-subtle"
              )}
              aria-label={`Rating ${option.value}`}>
              {option.emoji}
            </button>
          ))}
        </div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("feedback_comment_placeholder")}
          rows={3}
        />
      </div>
      <div className="flex flex-col-reverse gap-2 border-t bg-muted/72 px-6 py-4 sm:flex-row sm:justify-end">
        <DialogPrimitive.Close render={<Button variant="outline" />} onClick={handleSkip}>
          {t("skip")}
        </DialogPrimitive.Close>
        <Button onClick={handleSubmit} disabled={selectedRating === null || submitFeedbackMutation.isPending}>
          {t("submit_feedback")}
        </Button>
      </div>
    </>
  );

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={resetAndClose}>
      <DialogPrimitive.Portal>
        {/* Backdrop - blocking overlay */}
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-[9999] bg-black/32 backdrop-blur-sm",
            "transition-all duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
          )}
        />
        {/* Bottom-right positioned container */}
        <div className="fixed inset-0 z-[10000] flex items-end justify-end p-4 pb-24 sm:pb-4">
          <DialogPrimitive.Popup
            className={cn(
              "relative flex w-full max-w-md flex-col rounded-2xl border bg-popover text-popover-foreground shadow-lg",
              "transition-all duration-200",
              "data-ending-style:translate-y-4 data-ending-style:opacity-0",
              "data-starting-style:translate-y-4 data-starting-style:opacity-0"
            )}
            data-testid={isSuccess ? "feedback-success-dialog" : "feedback-dialog"}>
            {dialogContent}
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute end-2 top-2"
              render={<Button size="icon" variant="ghost" />}>
              <XIcon />
            </DialogPrimitive.Close>
          </DialogPrimitive.Popup>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default FeedbackDialog;
