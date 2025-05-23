import { _generateMetadata } from "app/_utils";

import Forms from "@calcom/app-store/routing-forms/pages/forms/[...appPages]";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${t("routing_forms")} | Cal.com Forms`,
    () => "",
    undefined,
    undefined,
    "/routing/forms"
  );
};

const ServerPage = async () => {
  return <Forms appUrl="/routing" />;
};

export default ServerPage;
