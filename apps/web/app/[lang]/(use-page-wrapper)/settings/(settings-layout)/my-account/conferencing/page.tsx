import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import { ConferencingAppsViewWebWrapper } from "@calcom/atoms/monorepo";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("conferencing"), t("conferencing_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);

  return (
    <ConferencingAppsViewWebWrapper
      title={t("conferencing")}
      description={t("conferencing_description")}
      add={t("add")}
    />
  );
};

export default Page;
