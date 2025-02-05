import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import CreateNewOutOfOfficeEntryButton from "@calcom/features/settings/outOfOffice/CreateNewOutOfOfficeEntryButton";
import { OutOfOfficeEntriesList } from "@calcom/features/settings/outOfOffice/OutOfOfficeEntriesList";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("out_of_office"),
    (t) => t("out_of_office_description")
  );

const Page = async () => {
  const t = await getTranslate();

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
