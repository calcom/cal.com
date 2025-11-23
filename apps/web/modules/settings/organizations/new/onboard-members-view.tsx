"use client";

import AddNewTeamMembers from "./_components/OnboardMembersView";
import { OrganizationWizardLayout } from "./_components/OrganizationWizardLayout";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return <OrganizationWizardLayout currentStep={4}>{children}</OrganizationWizardLayout>;
};

export default AddNewTeamMembers;
