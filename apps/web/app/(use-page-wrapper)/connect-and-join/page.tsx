import { _generateMetadata } from "app/_utils";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";

import LegacyPage from "~/connect-and-join/connect-and-join-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("connect_and_join"),
    () => "",
    undefined,
    undefined,
    "/connect-and-join"
  );
};

const ServerPage = async () => {
  return (
    <LicenseRequired>
      <LegacyPage />
    </LicenseRequired>
  );
};
export default ServerPage;
