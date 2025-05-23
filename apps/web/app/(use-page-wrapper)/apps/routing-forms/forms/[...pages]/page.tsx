import { _generateMetadata } from "app/_utils";

import Forms from "@calcom/app-store/routing-forms/pages/forms/[...appPages]";

export const generateMetadata = async ({ params }: { params: Promise<{ pages: string[] }> }) => {
  console.log((await params).pages);
  return await _generateMetadata(
    (t) => `${t("routing_forms")} | Cal.com Forms`,
    () => "",
    undefined,
    undefined,
    `/routing/forms/${(await params).pages.join("/")}`
  );
};

const ServerPage = async () => {
  return <Forms appUrl="/routing" />;
};

export default ServerPage;
