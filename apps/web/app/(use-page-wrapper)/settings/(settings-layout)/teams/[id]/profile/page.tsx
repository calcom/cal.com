import { _generateMetadata, getTranslate } from "app/_utils";

import LegacyPage from "@calcom/web/modules/ee/teams/views/team-profile-view";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/profile`
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("profile")}>
          <AppHeaderDescription>{t("profile_team_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <LegacyPage />
    </>
  );
};

export default Page;

export const unstable_dynamicStaleTime = 30;
