"use client";

import { WizardLayout } from "@calcom/ui";

import PaymentStatusView from "~/settings/organizations/new/_components/PaymentStatusView";

export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={5} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

export default PaymentStatusView;
