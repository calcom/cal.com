"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getFeatureOptInTimestamp,
  isFeatureFeedbackShown,
  setFeatureFeedbackShown,
} from "../lib/feature-opt-in-storage";

/** Delay before showing the feedback dialog to let the page finish loading */
const PAGE_LOAD_DELAY_MS = 5000;

export interface OptInFeedbackState {
  /** Whether the feedback dialog should be shown */
  showFeedbackDialog: boolean;
  /** Props to pass to the FeedbackDialog component */
  feedbackDialogProps: {
    surveyId: string;
    ratingQuestionId: string;
    commentQuestionId: string;
    titleKey?: string;
    descriptionKey?: string;
    showOn?: "all" | "desktop" | "mobile";
  } | null;
  /** Call this when the dialog is closed (either submitted or skipped) */
  onFeedbackComplete: () => void;
}

/**
 * Hook to manage feedback dialog display after a user opts into a feature.
 * Shows a custom feedback dialog after a configurable delay (waitAfterDays).
 */
function useOptInFeedback(
  featureId: string,
  featureConfig: OptInFeatureConfig | null
): OptInFeedbackState {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const hasTriggeredRef = useRef(false);

  const onFeedbackComplete = useCallback(() => {
    setShowFeedbackDialog(false);
    setFeatureFeedbackShown(featureId);
  }, [featureId]);

  useEffect(() => {
    if (!featureConfig?.formbricks) return;

    // Don't trigger if already triggered this session
    if (hasTriggeredRef.current) return;

    // Don't show if feedback was already shown (persisted in localStorage)
    const alreadyShown = isFeatureFeedbackShown(featureId);
    if (alreadyShown) return;

    // Don't trigger if user hasn't opted in yet
    const optInTimestamp = getFeatureOptInTimestamp(featureId);
    if (!optInTimestamp) return;

    // Don't trigger if survey is not configured
    const { surveyId, questions } = featureConfig.formbricks;
    if (!surveyId || !questions?.ratingQuestionId || !questions?.commentQuestionId) return;

    const { waitAfterDays } = featureConfig.formbricks;
    const waitAfterMs = waitAfterDays * 24 * 60 * 60 * 1000;
    const timeSinceOptIn = Date.now() - optInTimestamp;

    // Don't show feedback if not enough time has passed since opt-in
    // (e.g., wait 3 days after opt-in before asking for feedback)
    if (timeSinceOptIn < waitAfterMs) return;

    const triggerFeedback = (): void => {
      hasTriggeredRef.current = true;
      setShowFeedbackDialog(true);
    };

    // Show after page load delay to let the page finish loading
    const timer = setTimeout(triggerFeedback, PAGE_LOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [featureId, featureConfig]);

  const feedbackDialogProps = featureConfig?.formbricks?.surveyId
    ? {
        surveyId: featureConfig.formbricks.surveyId,
        ratingQuestionId: featureConfig.formbricks.questions.ratingQuestionId,
        commentQuestionId: featureConfig.formbricks.questions.commentQuestionId,
        titleKey: featureConfig.formbricks.titleKey,
        descriptionKey: featureConfig.formbricks.descriptionKey,
        showOn: featureConfig.formbricks.showOn,
      }
    : null;

  return {
    showFeedbackDialog,
    feedbackDialogProps,
    onFeedbackComplete,
  };
}

export { useOptInFeedback };
