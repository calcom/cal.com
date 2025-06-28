"use client";

import { CreateANewPlatformForm } from "@calcom/features/ee/platform/components/index";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { WizardLayout } from "@calcom/ui/components/layout";
import { useGetUserAttributes } from "@calcom/web/components/settings/platform/hooks/useGetUserAttributes";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const { t } = useLocale();
  const { isPlatformUser, userOrgId } = useGetUserAttributes();

  if (!isPlatformUser && userOrgId) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center">
        <div className="max-w-lg">
          <Alert severity="warning" title={t("organization_customer_cant_create_platform")} />
        </div>
      </div>
    );
  }

  return (
    <WizardLayout currentStep={1} maxSteps={1}>
      {children}
    </WizardLayout>
  );
};

export default CreateANewPlatformForm;
