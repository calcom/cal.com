"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { ButtonProps } from "@calcom/ui/components/button";
import { Button } from "@calcom/ui/components/button";

import { OutOfOfficeTab } from "./OutOfOfficeToggleGroup";

const CreateNewOutOfOfficeEntry = ({
  size,
  ...rest
}: {
  size?: ButtonProps["size"];
  "data-testid"?: string;
}) => {
  const { t } = useLocale();
  const me = useMeQuery();
  const { data: orgData } = trpc.viewer.organizations.listCurrent.useQuery();
  const isOrgAdminOrOwner = orgData && checkAdminOrOwner(orgData.user.role);
  const hasTeamOOOAdminAccess = isOrgAdminOrOwner || me?.data?.isTeamAdminOrOwner;

  const params = useCompatSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setOpenModal = useCallback(
    (open: boolean) => {
      const urlParams = new URLSearchParams(params ?? undefined);
      if (open) {
        urlParams.set("om", "true");
      } else {
        urlParams.delete("om");
      }
      router.push(`${pathname}?${urlParams.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  const selectedTab = params?.get("type") ?? OutOfOfficeTab.MINE;

  return (
    <Button
      color="primary"
      size={size ?? "base"}
      className="flex items-center justify-between px-4"
      StartIcon="plus"
      onClick={() => setOpenModal(true)}
      data-testid={rest["data-testid"]}
      disabled={selectedTab === OutOfOfficeTab.TEAM && !hasTeamOOOAdminAccess}>
      {t("add")}
    </Button>
  );
};

export default CreateNewOutOfOfficeEntry;
