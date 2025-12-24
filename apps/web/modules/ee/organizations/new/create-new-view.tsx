"use client";

import { CreateANewOrganizationForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { useGetUserAttributes } from "@calcom/web/components/settings/platform/hooks/useGetUserAttributes";

import { OrganizationWizardLayout } from "./_components/OrganizationWizardLayout";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const { t } = useLocale();
  const { isPlatformUser } = useGetUserAttributes();

  if (isPlatformUser) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center">
        <div className="max-w-lg">
          <Alert severity="warning" title={t("platform_customer_cant_create_organization")} />
        </div>
      </div>
    );
  }

  return <OrganizationWizardLayout currentStep={1}>{children}</OrganizationWizardLayout>;
};

export default CreateANewOrganizationForm;
