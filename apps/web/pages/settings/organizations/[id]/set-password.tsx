import { useRouter } from "next/router";

import { SetPasswordForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout, Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const SetPasswordPage = () => {
  const { t } = useLocale();
  const router = useRouter();
  if (!router.isReady) return null;
  return (
    <>
      <Meta title={t("set_a_password")} description={t("set_a_password_description")} />
      <SetPasswordForm />
    </>
  );
};
const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={2} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

SetPasswordPage.getLayout = LayoutWrapper;
SetPasswordPage.PageWrapper = PageWrapper;

export default SetPasswordPage;
