import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";
import { headers } from "next/headers";

import { ConferencingAppsViewWebWrapper } from "@calcom/atoms/monorepo";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("conferencing"),
    (t) => t("conferencing_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");

  return (
    <ConferencingAppsViewWebWrapper
      title={t("conferencing")}
      description={t("conferencing_description")}
      add={t("add")}
    />
  );
};

export default Page;
