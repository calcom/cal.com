import { _generateMetadata } from "app/_utils";

import { OutOfOfficeSettingsHeader } from "@calcom/features/settings/outOfOffice/OutOfOfficeSettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("out_of_office"),
    (t) => t("out_of_office_description")
  );

const Page = async () => {
  return <OutOfOfficeSettingsHeader />;
};

export default Page;
