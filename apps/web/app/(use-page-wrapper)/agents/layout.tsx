import { _generateMetadata } from "app/_utils";
import type { ReactNode } from "react";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("agents"),
    (t) => t("agents_description")
  );

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
