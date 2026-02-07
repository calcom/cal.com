"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { FeedbackDialog } from "@calcom/features/feedback/components/FeedbackDialog";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { FeatureOptInBanner } from "./FeatureOptInBanner";
import type { FeatureOptInMutations } from "./FeatureOptInConfirmDialog";
import { FeatureOptInConfirmDialog } from "./FeatureOptInConfirmDialog";

type UserRoleContext = {
  isOrgAdmin: boolean;
  orgId: number | null;
  adminTeamIds: number[];
  adminTeamNames: { id: number; name: string }[];
};

type FeedbackState = {
  showFeedbackDialog: boolean;
  feedbackDialogProps: {
    surveyId: string;
    ratingQuestionId: string;
    commentQuestionId: string;
    titleKey?: string;
    descriptionKey?: string;
    showOn?: "all" | "desktop" | "mobile";
  } | null;
  onFeedbackComplete: () => void;
};

type FeatureOptInTrackingData = {
  enableFor: "user" | "organization" | "teams";
  teamCount?: number;
  autoOptIn: boolean;
};

type FeatureOptInBannerState = {
  shouldShow: boolean;
  isLoading: boolean;
  featureConfig: OptInFeatureConfig | null;
  canOptIn: boolean;
  blockingReason: string | null;
  userRoleContext: UserRoleContext | null;
  isDialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  dismiss: () => void;
  markOptedIn: () => void;
  mutations: FeatureOptInMutations;
  feedback: FeedbackState;
  trackFeatureEnabled: (data: FeatureOptInTrackingData) => void;
};

interface FeatureOptInBannerWrapperProps {
  state: FeatureOptInBannerState;
}

function FeatureOptInBannerWrapper({ state }: FeatureOptInBannerWrapperProps): ReactElement | null {
  if (!state.featureConfig) {
    return null;
  }

  return (
    <>
      {state.shouldShow &&
        typeof document !== "undefined" &&
        createPortal(
          <FeatureOptInBanner
            featureConfig={state.featureConfig}
            onDismiss={state.dismiss}
            onOpenDialog={state.openDialog}
          />,
          document.body
        )}
      {state.userRoleContext && (
        <FeatureOptInConfirmDialog
          isOpen={state.isDialogOpen}
          onClose={state.closeDialog}
          onDismissBanner={state.dismiss}
          onOptInSuccess={state.markOptedIn}
          featureConfig={state.featureConfig}
          userRoleContext={state.userRoleContext}
          mutations={state.mutations}
          onTrackFeatureEnabled={state.trackFeatureEnabled}
        />
      )}
      {state.feedback.feedbackDialogProps && (
        <FeedbackDialog
          isOpen={state.feedback.showFeedbackDialog}
          onClose={state.feedback.onFeedbackComplete}
          onSubmitSuccess={state.feedback.onFeedbackComplete}
          surveyId={state.feedback.feedbackDialogProps.surveyId}
          ratingQuestionId={state.feedback.feedbackDialogProps.ratingQuestionId}
          commentQuestionId={state.feedback.feedbackDialogProps.commentQuestionId}
          titleKey={state.feedback.feedbackDialogProps.titleKey}
          descriptionKey={state.feedback.feedbackDialogProps.descriptionKey}
          showOn={state.feedback.feedbackDialogProps.showOn}
        />
      )}
    </>
  );
}

export default FeatureOptInBannerWrapper;
