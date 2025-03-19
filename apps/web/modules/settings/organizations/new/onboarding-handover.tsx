"use client";

import { AdminOnboardingHandover } from "@calcom/features/ee/organizations/components";
import { WizardLayout } from "@calcom/ui/components/layouts/WizardLayout";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <WizardLayout currentStep={2} maxSteps={2}>
      {children}
    </WizardLayout>
  );
};

export default AdminOnboardingHandover;
