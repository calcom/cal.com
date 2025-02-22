import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import { ConferencingAppsViewWebWrapper } from "@calcom/atoms/monorepo";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("conferencing"),
    (t) => t("conferencing_description")
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
