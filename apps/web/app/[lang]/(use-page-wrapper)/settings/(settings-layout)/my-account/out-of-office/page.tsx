import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import CreateNewOutOfOfficeEntryButton from "@calcom/features/settings/outOfOffice/CreateNewOutOfOfficeEntryButton";
import { OutOfOfficeEntriesList } from "@calcom/features/settings/outOfOffice/OutOfOfficeEntriesList";
import { OutOfOfficeToggleGroup } from "@calcom/features/settings/outOfOffice/OutOfOfficeToggleGroup";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("out_of_office"), t("out_of_office_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);

  return (
    <SettingsHeader
      title={t("out_of_office")}
      description={t("out_of_office_description")}
      CTA={
        <div className="flex gap-2">
          <OutOfOfficeToggleGroup />
          <CreateNewOutOfOfficeEntryButton data-testid="add_entry_ooo" />
        </div>
      }>
      <OutOfOfficeEntriesList />
    </SettingsHeader>
  );
};

export default Page;
