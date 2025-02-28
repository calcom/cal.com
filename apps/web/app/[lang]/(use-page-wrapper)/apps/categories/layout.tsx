import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("app_store"), t("app_store_description"));
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
