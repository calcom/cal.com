"use client";

import { WizardLayout } from "@calcom/ui/components/layout";

import AddNewTeamMembers from "./_components/OnboardMembersView";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <WizardLayout currentStep={4} maxSteps={5}>
      {children}
    </WizardLayout>
  );
};

export default AddNewTeamMembers;
