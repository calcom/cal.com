import type { ReactNode } from "react";

import Shell from "@calcom/features/shell/Shell";

export default function Layout({ children }: { children: ReactNode }) {
  return <Shell withoutMain={true}>{children}</Shell>;
}
