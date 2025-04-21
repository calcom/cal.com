import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("availability"),
    () => "",
    undefined,
    undefined,
    "/availability/schedule"
  );
};

export default function TroubleshooterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
