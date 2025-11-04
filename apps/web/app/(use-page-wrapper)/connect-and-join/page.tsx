import { _generateMetadata } from "app/_utils";

// import LegacyPage from "~/connect-and-join/connect-and-join-view";
import CalidConnectAndJoin from "../../../../../packages/calid/modules/instant-meeting/connect-and-join-view";

// /calid/modules/instant-meeting/connect-and-join-view.tsx"

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
    // <LicenseRequired>
    // <LegacyPage />
    // </LicenseRequired>
    <CalidConnectAndJoin />
  );
};
export default ServerPage;
