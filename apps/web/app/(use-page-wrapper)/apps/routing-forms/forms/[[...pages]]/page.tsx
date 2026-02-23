import { _generateMetadata } from "app/_utils";
import Forms from "./Forms";

export const generateMetadata = async ({ params }: { params: Promise<{ pages: string[] }> }) => {
  const pages = (await params).pages;

  return await _generateMetadata(
    (t) => `${t("routing_forms")} | Cal.com Forms`,
    () => "",
    undefined,
    undefined,
    `/routing/forms/${pages?.length > 0 ? pages.join("/") : ""}`
  );
};

const ServerPage = async () => {
  return <Forms appUrl="/routing" />;
};

export default ServerPage;
