import { buildWrappedOnboardTeamMembersPage } from "@pages/settings/organizations/[id]/onboard-members";
import LegacyPage from "@pages/settings/teams/[id]/onboard-members";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("add_team_members"),
    (t) => t("add_team_members_description")
  );

const Page = ({ params }: PageProps) => {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper
      getLayout={(page: React.ReactElement) => buildWrappedOnboardTeamMembersPage(params.id, page)}
      requiresLicense={false}
      nonce={nonce}
      themeBasis={null}>
      <LegacyPage />
    </PageWrapper>
  );
};

export default Page;
