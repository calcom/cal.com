"use client";

import AddNewTeamMembers from "@calcom/features/ee/teams/components/AddNewTeamMembers";
import { WizardLayout } from "@calcom/ui";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => (
  <WizardLayout currentStep={2} maxSteps={3}>
    {children}
  </WizardLayout>
);

export default AddNewTeamMembers;
