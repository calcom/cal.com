import LegacyPage, { GetLayout } from "@pages/settings/teams/[id]/onboard-members";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("add_team_members"),
    (t) => t("add_team_members_description")
  );

export default function Page() {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper getLayout={GetLayout} requiresLicense={false} nonce={nonce} themeBasis={null}>
      <LegacyPage />
    </PageWrapper>
  );
}
