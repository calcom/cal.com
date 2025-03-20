"use client";

import { CreateANewLicenseKeyForm } from "@calcom/features/ee/deployment/licensekey/CreateLicenseKeyForm";
import { WizardLayout } from "@calcom/ui/components/layout";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <WizardLayout currentStep={1} maxSteps={2}>
      {children}
    </WizardLayout>
  );
};

export default CreateANewLicenseKeyForm;
