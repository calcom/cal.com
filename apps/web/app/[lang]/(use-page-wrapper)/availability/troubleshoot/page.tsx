import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import Troubleshoot from "~/availability/troubleshoot/troubleshoot-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("troubleshoot"), t("troubleshoot_availability"));
};

const ServerPageWrapper = async () => {
  return <Troubleshoot />;
};

export default ServerPageWrapper;
