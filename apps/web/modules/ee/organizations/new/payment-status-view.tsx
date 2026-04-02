"use client";

import PaymentStatusView from "~/ee/organizations/new/_components/PaymentStatusView";
import { OrganizationWizardLayout } from "./_components/OrganizationWizardLayout";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return <OrganizationWizardLayout currentStep={5}>{children}</OrganizationWizardLayout>;
};

export default PaymentStatusView;
