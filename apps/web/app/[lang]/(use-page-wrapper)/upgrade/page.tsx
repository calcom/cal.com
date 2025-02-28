import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import LegacyPage from "~/upgrade/upgrade-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("upgrade"), "");
};

const ServerPage = async ({ params }: PageProps) => {
  return <LegacyPage />;
};

export default ServerPage;
