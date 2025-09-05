import OutOfOfficeEntriesList from "@calcom/features/settings/outOfOffice/OutOfOfficeEntriesList";
import { _generateMetadata } from "app/_utils";

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
