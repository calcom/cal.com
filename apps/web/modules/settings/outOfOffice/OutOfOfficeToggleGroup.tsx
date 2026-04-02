"use client";

import { useCompatSearchParams } from "@calcom/embed-core/src/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select, ToggleGroup } from "@calcom/ui/components/form";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

export enum OutOfOfficeTab {
  MINE = "mine",
  TEAM = "team",
  HOLIDAYS = "holidays",
}

export const OutOfOfficeToggleGroup = () => {
  const { t } = useLocale();
  const searchParams = useCompatSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams ?? undefined);
      params.set(name, value);

      return params.toString();
    },
    [searchParams]
  );

  const selectedTab = searchParams?.get("type") ?? OutOfOfficeTab.MINE;

  const tabOptions = useMemo(
    () => [
      { value: OutOfOfficeTab.MINE, label: t("my_ooo") },
      { value: OutOfOfficeTab.TEAM, label: t("team_ooo") },
      { value: OutOfOfficeTab.HOLIDAYS, label: t("holidays") },
    ],
    [t]
  );

  const handleTabChange = useCallback(
    (value: string | null) => {
      if (!value) return;
      const newQuery = createQueryString("type", value);
      router.push(`${pathname}?${newQuery}`);
    },
    [createQueryString, pathname, router]
  );

  const selectedOption = useMemo(
    () => tabOptions.find((opt) => opt.value === selectedTab) ?? tabOptions[0],
    [selectedTab, tabOptions]
  );

  return (
    <>
      {/* Mobile: Select dropdown */}
      <div className="md:hidden">
        <Select
          className="w-[120px]"
          value={selectedOption}
          onChange={(option) => handleTabChange(option?.value ?? null)}
          options={tabOptions}
        />
      </div>
      {/* Desktop: Toggle group */}
      <ToggleGroup
        className="hidden md:flex"
        defaultValue={selectedTab}
        onValueChange={handleTabChange}
        options={tabOptions}
      />
    </>
  );
};
