import { _generateMetadata } from "app/_utils";
import OutOfOfficeView from "~/settings/my-account/out-of-office-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("out_of_office"),
    (t) => t("out_of_office_description"),
    undefined,
    undefined,
    "/settings/my-account/out-of-office"
  );

const Page = () => {
  return <OutOfOfficeView />;
};

export default Page;
