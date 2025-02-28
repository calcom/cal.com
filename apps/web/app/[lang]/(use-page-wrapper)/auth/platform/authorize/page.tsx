import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import Page from "~/auth/platform/authorize-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("authorize"), "");
};

const ServerPageWrapper = async () => {
  return <Page />;
};

export default ServerPageWrapper;
