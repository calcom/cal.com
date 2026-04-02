import { _generateMetadata } from "app/_utils";
import Troubleshoot from "~/availability/troubleshoot/troubleshoot-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("troubleshoot"),
    (t) => t("troubleshoot_availability"),
    undefined,
    undefined,
    "/availability/troubleshoot"
  );
};

const ServerPage = async () => {
  return <Troubleshoot />;
};

export default ServerPage;
