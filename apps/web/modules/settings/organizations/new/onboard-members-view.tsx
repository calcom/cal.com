"use client";

import { WizardLayout } from "@calcom/ui";

import AddNewTeamMembers from "./_components/OnboardMembersView";

export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={4} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

export default AddNewTeamMembers;
