"use client";

import { WizardLayout } from "@calcom/ui";

import PaymentSuccessView from "~/settings/organizations/new/_components/PaymentSuccessView";

export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={5} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

export default PaymentSuccessView;
