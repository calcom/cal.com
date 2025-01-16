"use client";

import { PaymentSuccessView } from "@calcom/features/ee/organizations/new/_components";
import { WizardLayout } from "@calcom/ui";

export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={1} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

export default PaymentSuccessView;
