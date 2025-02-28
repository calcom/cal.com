import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";

import LegacyPage from "~/connect-and-join/connect-and-join-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("connect_and_join"), "");
};

const ServerPage = async () => {
  return (
    <LicenseRequired>
      <LegacyPage />
    </LicenseRequired>
  );
};
export default ServerPage;
