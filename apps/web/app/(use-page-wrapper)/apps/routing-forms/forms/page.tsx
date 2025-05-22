import { _generateMetadata } from "app/_utils";

import Forms from "@calcom/app-store/routing-forms/pages/forms/[...appPages]";

import FormProvider from "../[...pages]/FormProvider";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${t("routing_forms")} | Cal.com Forms`,
    () => "",
    undefined,
    undefined,
    `/apps/routing-forms/forms`
  );
};

const ServerPage = async () => {
  return (
    <FormProvider>
      <Forms appUrl="/apps/routing-forms" />
    </FormProvider>
  );
};

export default ServerPage;
