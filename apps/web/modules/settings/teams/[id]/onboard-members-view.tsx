"use client";

import AddNewTeamMembers from "@calcom/features/ee/teams/components/AddNewTeamMembers";
import { WizardLayout } from "@calcom/ui";

export const GetLayout = (page: React.ReactElement) => (
  <WizardLayout currentStep={2} maxSteps={3}>
    {page}
  </WizardLayout>
);

export default AddNewTeamMembers;
