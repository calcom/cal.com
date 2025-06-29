"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Overview",
      href: "/settings/admin/playground",
      current: pathname === "/settings/admin/playground",
    },
    {
      name: "Drop Off",
      href: "/settings/admin/playground/dropoff",
      current: pathname === "/settings/admin/playground/dropoff",
    },
  ];

  const isPlaygroundRoot = pathname === "/settings/admin/playground";

  return isPlaygroundRoot ? (
    children
  ) : (
    <div>
      <Link href="/settings/admin/playground" className="text-sm underline">
        ← Playground
      </Link>
      <div className="h-8" />
      <div>{children}</div>
    </div>
  );
}
