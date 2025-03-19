"use client";

import { WizardLayout } from "@calcom/ui/components/layout";

import PaymentStatusView from "~/settings/organizations/new/_components/PaymentStatusView";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <WizardLayout currentStep={5} maxSteps={5}>
      {children}
    </WizardLayout>
  );
};

export default PaymentStatusView;
