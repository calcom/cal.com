import { HomeLayout } from "fumadocs-ui/layout";
import type { ReactNode } from "react";

import { baseOptions } from "../layout.config";

export default function Layout({ children }: { children: ReactNode }) {
  // @ts-expect-error weird type check
  return <HomeLayout {...baseOptions}>{children}</HomeLayout>;
}
