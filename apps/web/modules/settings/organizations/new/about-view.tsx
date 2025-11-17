"use client";

import { AboutOrganizationForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { WizardLayout } from "@calcom/ui/components/layout";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const { t } = useLocale();

  return (
    <WizardLayout
      currentStep={2}
      maxSteps={5}
      footer={<Alert severity="warning" message={t("organization_trial_workspace_warning")} />}>
      {children}
    </WizardLayout>
  );
};

export default AboutOrganizationForm;
