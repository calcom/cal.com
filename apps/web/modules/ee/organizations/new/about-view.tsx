"use client";

import { AboutOrganizationForm } from "~/ee/organizations/components/AboutOrganizationForm";

import { OrganizationWizardLayout } from "./_components/OrganizationWizardLayout";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return <OrganizationWizardLayout currentStep={2}>{children}</OrganizationWizardLayout>;
};

export default AboutOrganizationForm;
