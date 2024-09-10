"use client";

import { CreateANewLicenseKeyForm } from "@calcom/features/ee/deployment/licensekey/CreateLicenseKeyForm";
import { WizardLayout } from "@calcom/ui";

export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={1} maxSteps={2}>
      {page}
    </WizardLayout>
  );
};

export default CreateANewLicenseKeyForm;
