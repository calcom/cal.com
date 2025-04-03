import { componentSource } from "@/app/source";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { ReactNode } from "react";

import { IconSprites } from "@calcom/ui/components/icon";

import { baseOptions } from "../layout.config";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={componentSource.pageTree} {...baseOptions}>
      <TooltipProvider>{children}</TooltipProvider>
      <IconSprites />
    </DocsLayout>
  );
}
