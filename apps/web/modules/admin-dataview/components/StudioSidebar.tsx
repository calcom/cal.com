"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { registry } from "@calcom/features/admin-dataview/registry";

import classNames from "@calcom/ui/classNames";
import { Grid3x3Icon, CreditCardIcon, ShieldIcon, LayersIcon, UsersIcon, MoonIcon, SunIcon } from "@coss/ui/icons";

import { GlobalSearchTrigger, GlobalSearchDialog } from "./GlobalSearch";

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  core: { label: "Core", icon: UsersIcon },
  billing: { label: "Billing", icon: CreditCardIcon },
  platform: { label: "Platform", icon: LayersIcon },
  abuse: { label: "Abuse", icon: ShieldIcon },
  system: { label: "System", icon: Grid3x3Icon },
};

function groupByCategory() {
  
  const groups: Record<string, ReturnType<typeof registry.getAll>> = {};
  for (const table of registry.getAll()) {
    if (!groups[table.category]) groups[table.category] = [];
    groups[table.category].push(table);
  }
  return groups;
}

export function StudioSidebar() {
  const pathname = usePathname();
  const groups = groupByCategory();
  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openSearch = useCallback(() => setSearchOpen(true), []);

  return (
    <nav className="bg-default flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex h-10 items-center gap-2 px-3">
        <Grid3x3Icon className="text-subtle h-4 w-4 shrink-0" />
        <span className="text-emphasis truncate text-sm font-semibold">Data Studio</span>
      </div>

      {/* Search trigger button */}
      <GlobalSearchTrigger onClick={openSearch} />

      {/* Table list */}
      <div className="mt-2 flex-1 overflow-y-auto px-2 py-1">
        {Object.entries(groups).map(([category, tables]) => {
          const meta = CATEGORY_META[category] ?? { label: category, icon: Grid3x3Icon };
          const Icon = meta.icon;
          return (
            <div key={category} className="mb-1">
              <div className="text-subtle flex h-7 items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider">
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{meta.label}</span>
              </div>
              {tables.map((table) => {
                const href = `/admin/data/${table.slug}`;
                const isActive = pathname === href;
                return (
                  <Link
                    key={table.slug}
                    href={href}
                    className={classNames(
                      "text-default hover:bg-subtle flex h-7 items-center gap-2 rounded-md px-2 text-xs transition-colors",
                      isActive && "bg-subtle text-emphasis font-medium"
                    )}>
                    <span
                      className={classNames(
                        "h-1 w-1 shrink-0 rounded-full",
                        isActive ? "bg-inverted" : "bg-muted"
                      )}
                    />
                    <span className="truncate">{table.displayNamePlural}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-muted flex h-8 items-center justify-between px-3 text-[10px]">
        <span>{registry.count} tables</span>
        <ThemeToggle />
      </div>

      {/* ⌘K Command palette dialog */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </nav>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="text-muted hover:text-default rounded p-1 transition-colors"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
      {isDark ? <SunIcon className="h-3.5 w-3.5" /> : <MoonIcon className="h-3.5 w-3.5" />}
    </button>
  );
}
