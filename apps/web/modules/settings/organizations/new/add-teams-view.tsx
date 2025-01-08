"use client";

import { WizardLayout } from "@calcom/ui";

import { AddNewTeamsForm } from "./_components/AddNewTeamsForm";

export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={3} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

export default AddNewTeamsForm;
