import { _generateMetadata } from "app/_utils";

import OutOfOfficeEntriesList from "@calcom/features/settings/outOfOffice/OutOfOfficeEntriesList";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("out_of_office"),
    (t) => t("out_of_office_description"),
    undefined,
    undefined,
    "/settings/my-account/out-of-office"
  );

const Page = () => {
  return <OutOfOfficeEntriesList />;
};

export default Page;
