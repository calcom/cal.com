"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { WizardLayout } from "@calcom/ui/components/layout";

import AddNewTeamMembers from "./_components/OnboardMembersView";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const { t } = useLocale();

  return (
    <WizardLayout
      currentStep={4}
      maxSteps={5}
      footer={<Alert severity="warning" message={t("organization_trial_workspace_warning")} />}>
      {children}
    </WizardLayout>
  );
};

export default AddNewTeamMembers;
