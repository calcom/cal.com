import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import { ConferencingAppsViewWebWrapper } from "@calcom/atoms/connect/conferencing-apps/ConferencingAppsViewWebWrapper";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("conferencing"),
    (t) => t("conferencing_description"),
    undefined,
    undefined,
    "/settings/my-account/conferencing"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <ConferencingAppsViewWebWrapper
      title={t("conferencing")}
      description={t("conferencing_description")}
      add={t("add")}
    />
  );
};

export default Page;
