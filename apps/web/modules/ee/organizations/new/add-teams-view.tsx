"use client";

import { AddNewTeamsForm } from "./_components/AddNewTeamsForm";
import { OrganizationWizardLayout } from "./_components/OrganizationWizardLayout";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return <OrganizationWizardLayout currentStep={3}>{children}</OrganizationWizardLayout>;
};

export default AddNewTeamsForm;
