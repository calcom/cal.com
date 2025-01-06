"use client";

import AddNewTeamMembers from "@calcom/features/ee/teams/components/AddNewTeamMembers";
import { WizardLayout } from "@calcom/ui";

export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={3} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

export default AddNewTeamMembers;
