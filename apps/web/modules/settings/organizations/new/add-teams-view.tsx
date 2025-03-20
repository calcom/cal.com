"use client";

import { WizardLayout } from "@calcom/ui/components/layout";

import { AddNewTeamsForm } from "./_components/AddNewTeamsForm";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <WizardLayout currentStep={3} maxSteps={5}>
      {children}
    </WizardLayout>
  );
};

export default AddNewTeamsForm;
