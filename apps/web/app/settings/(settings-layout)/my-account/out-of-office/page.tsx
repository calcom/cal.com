import { _generateMetadata } from "app/_utils";
import { getTranslations } from "next-intl/server";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import CreateNewOutOfOfficeEntryButton from "@calcom/features/settings/outOfOffice/CreateNewOutOfOfficeEntryButton";
import { OutOfOfficeEntriesList } from "@calcom/features/settings/outOfOffice/OutOfOfficeEntriesList";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("out_of_office"),
    (t) => t("out_of_office_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();

  const t = await getTranslations();

  return (
    <SettingsHeader
      title={t("out_of_office")}
      description={t("out_of_office_description")}
      CTA={<CreateNewOutOfOfficeEntryButton />}>
      <OutOfOfficeEntriesList />
    </SettingsHeader>
  );
};

export default Page;
