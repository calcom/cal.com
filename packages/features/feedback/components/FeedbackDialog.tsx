"use client";

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
  /** Where to show the dialog: "all" | "desktop" | "mobile". Defaults to "all". */
  showOn?: "all" | "desktop" | "mobile";
}

/**
 * Bottom-right positioned feedback card (non-blocking).
 * Styled similar to the feature opt-in banner.
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
  showOn = "all",
}: FeedbackDialogProps): ReactElement | null {
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

  if (!isOpen) {
    return null;
  }

  // Visibility classes based on showOn
  const visibilityClass = showOn === "desktop" ? "hidden sm:block" : showOn === "mobile" ? "sm:hidden" : "";
  const showMobileBackdrop = showOn !== "desktop";

  if (isSuccess) {
    return (
      <>
        {/* Mobile-only backdrop */}
        {showMobileBackdrop && (
          <div className="fixed inset-0 z-40 bg-black/50 sm:hidden" onClick={resetAndClose} />
        )}
        <div
          data-testid="feedback-success-dialog"
          className={cn(
            "bg-default border-subtle fixed bottom-24 left-5 right-5 z-50 rounded-lg border shadow-lg sm:bottom-5 sm:left-auto sm:max-w-sm",
            visibilityClass
          )}>
          <div className="relative p-4">
            <button
              type="button"
              onClick={resetAndClose}
              className="absolute top-2 right-2 rounded-md p-1 hover:bg-subtle"
              aria-label={t("close")}>
              <XIcon className="h-4 w-4" />
            </button>
            <h3 className="text-emphasis text-lg font-semibold">{t("feedback_submitted_title")}</h3>
            <p className="text-subtle mt-1 text-sm">{t("feedback_submitted_description")}</p>
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={resetAndClose}>
                {t("done")}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile-only backdrop */}
      {showMobileBackdrop && (
        <div className="fixed inset-0 z-40 bg-black/50 sm:hidden" onClick={handleSkip} />
      )}
      <div
        data-testid="feedback-dialog"
        className={cn(
          "bg-default border-subtle fixed bottom-24 left-5 right-5 z-50 rounded-lg border shadow-lg sm:bottom-5 sm:left-auto sm:max-w-sm",
          visibilityClass
        )}>
        <div className="relative p-4">
          <button
            type="button"
            onClick={handleSkip}
            className="absolute top-2 right-2 rounded-md p-1 hover:bg-subtle"
            aria-label={t("close")}>
            <XIcon className="h-4 w-4" />
          </button>
          <h3 className="text-emphasis text-lg font-semibold">{t(titleKey)}</h3>
          <p className="text-subtle mt-1 text-sm">{t(descriptionKey)}</p>

          <div className="mt-4 flex justify-center gap-2">
            {RATING_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedRating(option.value)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-all",
                  selectedRating === option.value ? "bg-emphasis" : "hover:bg-subtle"
                )}
                aria-label={`Rating ${option.value}`}>
                {option.emoji}
              </button>
            ))}
          </div>

          <Textarea
            className="mt-3"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("feedback_comment_placeholder")}
            rows={2}
          />

          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={handleSkip}>
              {t("skip")}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={selectedRating === null || submitFeedbackMutation.isPending}>
              {t("submit_feedback")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default FeedbackDialog;
