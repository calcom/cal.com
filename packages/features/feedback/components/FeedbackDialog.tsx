"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Textarea } from "@coss/ui/components/textarea";
import { toastManager } from "@coss/ui/components/toast";
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
  title?: string;
  description?: string;
}

export function FeedbackDialog({
  isOpen,
  onClose,
  onSubmitSuccess,
  surveyId,
  ratingQuestionId,
  commentQuestionId,
  title,
  description,
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

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={resetAndClose}>
        <DialogPopup className="sm:max-w-md" data-testid="feedback-success-dialog">
          <DialogHeader>
            <DialogTitle>{t("feedback_submitted_title")}</DialogTitle>
            <DialogDescription>{t("feedback_submitted_description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={resetAndClose}>{t("done")}</Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogPopup className="sm:max-w-md" data-testid="feedback-dialog">
        <DialogHeader>
          <DialogTitle>{title || t("feedback_dialog_title")}</DialogTitle>
          <DialogDescription>{description || t("feedback_dialog_description")}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-default text-sm font-medium">{t("feedback_rating_question")}</p>
              <div className="flex justify-center gap-2">
                {RATING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedRating(option.value)}
                    className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-2xl transition-all ${
                      selectedRating === option.value
                        ? "border-emphasis bg-emphasis"
                        : "border-default hover:border-subtle hover:bg-subtle"
                    }`}
                    aria-label={`Rating ${option.value}`}>
                    {option.emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-default text-sm font-medium">{t("feedback_comment_question")}</p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("feedback_comment_placeholder")}
                rows={3}
              />
            </div>
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />} onClick={handleSkip}>
            {t("skip")}
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={selectedRating === null || submitFeedbackMutation.isPending}>
            {t("submit_feedback")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

export default FeedbackDialog;
