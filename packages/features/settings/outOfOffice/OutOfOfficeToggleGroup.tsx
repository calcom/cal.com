"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

import { useCompatSearchParams } from "@calcom/embed-core/src/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { ToggleGroup } from "@calcom/ui";

export enum OutOfOfficeTab {
  MINE = "mine",
  TEAM = "team",
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

  const { data: user } = trpc.viewer.me.useQuery();
  const { data } = trpc.viewer.organizations.listCurrent.useQuery();
  const isOrgAdminOrOwner =
    data && (data.user.role === MembershipRole.OWNER || data.user.role === MembershipRole.ADMIN);
  const toggleGroupOptions = [{ value: OutOfOfficeTab.MINE, label: t("my_ooo") }];
  const hasTeamOOOAccess = isOrgAdminOrOwner || user?.isTeamAdminOrOwner;
  if (hasTeamOOOAccess) {
    toggleGroupOptions.push({ value: OutOfOfficeTab.TEAM, label: t("team_ooo") });
  }

  return (
    <ToggleGroup
      className="hidden md:block"
      defaultValue={selectedTab}
      onValueChange={(value) => {
        if (!value) return;
        const newQuery = createQueryString("type", value);
        router.push(`${pathname}?${newQuery}`);
      }}
      options={toggleGroupOptions}
      disabled={!hasTeamOOOAccess}
    />
  );
};
