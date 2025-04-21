import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("troubleshoot"),
    (t) => t("troubleshoot_availability"),
    undefined,
    undefined,
    "/availability/troubleshoot"
  );
};

export default function TroubleshooterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
