import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative"),
    undefined,
    undefined,
    "/teams"
  );

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
