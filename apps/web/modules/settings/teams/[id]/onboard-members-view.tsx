"use client";

import { WizardLayout } from "@calcom/ui/components/layout";
import AddNewTeamMembers from "@calcom/web/modules/ee/teams/components/AddNewTeamMembers";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => (
  <WizardLayout currentStep={2} maxSteps={3}>
    {children}
  </WizardLayout>
);

export default AddNewTeamMembers;
