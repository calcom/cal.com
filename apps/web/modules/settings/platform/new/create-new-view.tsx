"use client";

import { CreateANewPlatformForm } from "@calcom/features/ee/platform/components/index";
import { WizardLayout } from "@calcom/ui";

export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={1} maxSteps={1}>
      {page}
    </WizardLayout>
  );
};

export default CreateANewPlatformForm;
