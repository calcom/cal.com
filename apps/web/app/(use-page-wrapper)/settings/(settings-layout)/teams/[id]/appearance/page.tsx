import { _generateMetadata, getTranslate } from "app/_utils";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

import LegacyPage from "~/ee/teams/views/team-appearance-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("booking_appearance"),
    (t) => t("appearance_team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/appearance`
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("booking_appearance")}>
          <AppHeaderDescription>{t("appearance_team_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <LegacyPage />
    </>
  );
};

export default Page;

export const unstable_dynamicStaleTime = 30;
