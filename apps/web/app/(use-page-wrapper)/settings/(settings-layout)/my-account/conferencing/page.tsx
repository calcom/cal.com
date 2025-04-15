import { _generateMetadata } from "app/_utils";

import { ConferencingAppsViewWebWrapper } from "@calcom/atoms/connect/conferencing-apps/ConferencingAppsViewWebWrapper";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("conferencing"),
    (t) => t("conferencing_description")
  );

const Page = async () => {
  return <ConferencingAppsViewWebWrapper />;
};

export default Page;
