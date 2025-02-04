import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("app_store"),
    (t) => t("app_store_description")
  );
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
