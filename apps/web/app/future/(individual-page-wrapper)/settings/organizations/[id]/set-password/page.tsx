import OldPage from "@pages/settings/organizations/[id]/set-password";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";

import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("set_a_password"),
    (t) => t("set_a_password_description")
  );

const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={2} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

const Page = () => {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper getLayout={LayoutWrapper} requiresLicense={false} nonce={nonce} themeBasis={null}>
      <OldPage />
    </PageWrapper>
  );
};

export default Page;
