import { SetPasswordForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta, WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";

const SetPasswordPage = () => {
  const { t } = useLocale();
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
