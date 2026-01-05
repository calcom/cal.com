"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPlaygroundRoot = pathname === "/settings/admin/playground";

  return isPlaygroundRoot ? (
    children
  ) : (
    <div>
      <Link href="/settings/admin/playground" class="text-sm underline">
        ← Playground
      </Link>
      <div class="h-8" />
      <div>{children}</div>
    </div>
  );
}
