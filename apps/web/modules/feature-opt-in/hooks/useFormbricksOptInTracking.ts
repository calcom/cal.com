"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { useCallback, useEffect, useRef, useState } from "react";
import { getFeatureOptInTimestamp, isFeatureTracked, setFeatureTracked } from "../lib/feature-opt-in-storage";

/** Delay before showing the feedback dialog to let the page finish loading */
const PAGE_LOAD_DELAY_MS = 5000;

export interface FormbricksOptInTrackingResult {
  /** Whether the feedback dialog should be shown */
  showFeedbackDialog: boolean;
  /** Props to pass to the FeedbackDialog component */
  feedbackDialogProps: {
    surveyId: string;
    ratingQuestionId: string;
    commentQuestionId: string;
    titleKey?: string;
    descriptionKey?: string;
  } | null;
  /** Call this when the dialog is closed (either submitted or skipped) */
  onFeedbackComplete: () => void;
}

/**
 * Hook to handle delayed Formbricks feedback after a user opts into a feature.
 * Returns state to control a custom feedback dialog instead of using Formbricks' built-in popup.
 */
function useFormbricksOptInTracking(
  featureId: string,
  featureConfig: OptInFeatureConfig | null
): FormbricksOptInTrackingResult {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const hasTriggeredRef = useRef(false);

  const onFeedbackComplete = useCallback(() => {
    setShowFeedbackDialog(false);
    setFeatureTracked(featureId);
  }, [featureId]);

  useEffect(() => {
    if (!featureConfig?.formbricks) return;

    // Don't trigger if already triggered this session
    if (hasTriggeredRef.current) return;

    // Don't trigger if already tracked (persisted in localStorage)
    const alreadyTracked = isFeatureTracked(featureId);
    if (alreadyTracked) return;

    // Don't trigger if user hasn't opted in yet
    const optInTimestamp = getFeatureOptInTimestamp(featureId);
    if (!optInTimestamp) return;

    // Don't trigger if survey is not configured
    const { surveyId, questions } = featureConfig.formbricks;
    if (!surveyId || !questions?.ratingQuestionId || !questions?.commentQuestionId) return;

    const { delayMs } = featureConfig.formbricks;
    const timeSinceOptIn = Date.now() - optInTimestamp;

    // Don't show feedback if not enough time has passed since opt-in
    // (e.g., wait 3 days after opt-in before asking for feedback)
    if (timeSinceOptIn < delayMs) return;

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
      }
    : null;

  return {
    showFeedbackDialog,
    feedbackDialogProps,
    onFeedbackComplete,
  };
}

export { useFormbricksOptInTracking };
