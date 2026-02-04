"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
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
    </>
  );
}

export default FeatureOptInBannerWrapper;
