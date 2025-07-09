import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("app_store"),
    (t) => t("app_store_description"),
    undefined,
    undefined,
    "/apps/categories"
  );
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
