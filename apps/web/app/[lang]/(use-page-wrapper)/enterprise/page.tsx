import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import EnterprisePage from "@components/EnterprisePage";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("create_your_org"), t("create_your_org_description"));
};

const ServerPageWrapper = async () => {
  return <EnterprisePage />;
};

export default ServerPageWrapper;
