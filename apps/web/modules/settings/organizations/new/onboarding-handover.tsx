"use client";

import { AdminOnboardingHandover } from "@calcom/features/ee/organizations/components";
import { WizardLayout } from "@calcom/ui";

export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={2} maxSteps={2}>
      {page}
    </WizardLayout>
  );
};

export default AdminOnboardingHandover;
