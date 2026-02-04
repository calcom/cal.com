"use client";

import { WizardLayout } from "@calcom/ui/components/layout";
import { CreateANewLicenseKeyForm } from "~/ee/deployment/components/CreateLicenseKeyForm";

export default function SettingsNewView() {
  return (
    <WizardLayout currentStep={1} maxSteps={2}>
      <CreateANewLicenseKeyForm />
    </WizardLayout>
  );
};
