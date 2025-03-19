"use client";

import { CreateANewOrganizationForm } from "@calcom/features/ee/organizations/components";
import { WizardLayout } from "@calcom/ui/components/layout";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <WizardLayout currentStep={1} maxSteps={5}>
      {children}
    </WizardLayout>
  );
};

export default CreateANewOrganizationForm;
