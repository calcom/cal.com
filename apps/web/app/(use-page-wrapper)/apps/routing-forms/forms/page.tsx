import { _generateMetadata } from "app/_utils";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import Forms from "@calcom/app-store/routing-forms/pages/forms/[...appPages]";

import FormProvider from "../[...pages]/FormProvider";

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
  const app = await getAppWithMetadata({ slug: "routing-forms" });

  return (
    <FormProvider>
      <Forms appUrl={app?.simplePath ?? "/routing"} />
    </FormProvider>
  );
};

export default ServerPage;
