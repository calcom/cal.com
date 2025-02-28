import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  return await _generateMetadata(t("admin"), "");
};

const Page = () => <h1>Admin index</h1>;
export default Page;
