import { _generateMetadata } from "app/_utils";
import type { ReactNode } from "react";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("workflows"),
    (t) => t("workflows_to_automate_notifications")
  );

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
