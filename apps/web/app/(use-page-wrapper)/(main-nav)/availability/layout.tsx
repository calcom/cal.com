import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("availability"),
    (t) => t("configure_availability"),
    undefined,
    undefined,
    "/availability"
  );
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
