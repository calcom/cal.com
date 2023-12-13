import LegacyPage, { LayoutWrapper } from "@pages/settings/teams/new/index";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_new_team"),
    (t) => t("create_new_team_description")
  );

export default function Page() {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper getLayout={LayoutWrapper} requiresLicense={false} nonce={nonce} themeBasis={null}>
      <LegacyPage />
    </PageWrapper>
  );
}
