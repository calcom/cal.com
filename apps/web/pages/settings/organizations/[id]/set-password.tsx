import Head from "next/head";
import { useRouter } from "next/router";

import { SetPasswordForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const SetPasswordPage = () => {
  const { t } = useLocale();
  const router = useRouter();
  if (!router.isReady) return null;
  return (
    <>
      <Head>
        <title>Set a password</title>
        <meta
          name="description"
          content="This will create a new user account with your organization email and this password."
        />
      </Head>
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
