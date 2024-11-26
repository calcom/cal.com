import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";

import { ConferencingAppsViewWebWrapper } from "@calcom/atoms/monorepo";
import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("conferencing"),
    (t) => t("conferencing_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <ConferencingAppsViewWebWrapper
      title={t("conferencing")}
      description={t("conferencing_description")}
      add={t("add")}
    />
  );
};

export default Page;
