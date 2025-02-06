"use client";

import { AddNewTeamsForm } from "@calcom/features/ee/organizations/components";
import { WizardLayout } from "@calcom/ui";

export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={5} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

export default AddNewTeamsForm;
