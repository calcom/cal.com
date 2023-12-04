import LegacyPage from "@pages/settings/teams/[id]/onboard-members";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";

import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("add_team_members"),
    (t) => t("add_team_members_description")
  );

const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={2} maxSteps={2}>
      {page}
    </WizardLayout>
  );
};

export default function Page() {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper getLayout={LayoutWrapper} requiresLicense={false} nonce={nonce} themeBasis={null}>
      <LegacyPage />
    </PageWrapper>
  );
}
