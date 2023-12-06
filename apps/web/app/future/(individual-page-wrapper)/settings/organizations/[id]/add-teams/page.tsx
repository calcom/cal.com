import OldPage from "@pages/settings/organizations/[id]/add-teams";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_your_teams"),
    (t) => t("create_your_teams_description")
  );

const LayoutWrapper = (page: React.ReactElement) => (
  <WizardLayout
    currentStep={5}
    maxSteps={5}
    isOptionalCallback={() => {
      redirect(`/event-types`);
    }}>
    {page}
  </WizardLayout>
);

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
