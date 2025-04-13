"use client";

import { CreateANewPlatformForm } from "@calcom/features/ee/platform/components/index";
import { WizardLayout } from "@calcom/ui/components/layout";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <WizardLayout currentStep={1} maxSteps={1}>
      {children}
    </WizardLayout>
  );
};

export default CreateANewPlatformForm;
