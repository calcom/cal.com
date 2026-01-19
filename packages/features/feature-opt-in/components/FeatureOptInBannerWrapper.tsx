"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import type { ReactElement } from "react";

import { FeatureOptInBanner } from "./FeatureOptInBanner";
import type { FeatureOptInMutations } from "./FeatureOptInConfirmDialog";
import { FeatureOptInConfirmDialog } from "./FeatureOptInConfirmDialog";

type UserRoleContext = {
  isOrgAdmin: boolean;
  orgId: number | null;
  adminTeamIds: number[];
  adminTeamNames: { id: number; name: string }[];
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
      {state.shouldShow && (
        <FeatureOptInBanner
          featureConfig={state.featureConfig}
          onDismiss={state.dismiss}
          onOpenDialog={state.openDialog}
        />
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
        />
      )}
    </>
  );
}

export default FeatureOptInBannerWrapper;
