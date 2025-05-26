"use client";

import { useState, useEffect } from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { ButtonProps } from "@calcom/ui/components/button";
import { Button } from "@calcom/ui/components/button";

import { CreateOrEditOutOfOfficeEntryModal } from "./CreateOrEditOutOfOfficeModal";
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
  const openModalOnStart = !!params?.get("om");
  useEffect(() => {
    if (openModalOnStart) {
      setOpenModal(true);
    }
  }, [openModalOnStart]);

  const [openModal, setOpenModal] = useState(false);
  const selectedTab = params?.get("type") ?? OutOfOfficeTab.MINE;

  return (
    <>
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
      {openModal && (
        <CreateOrEditOutOfOfficeEntryModal
          openModal={openModal}
          closeModal={() => {
            setOpenModal(false);
          }}
          currentlyEditingOutOfOfficeEntry={null}
        />
      )}
    </>
  );
};

export default CreateNewOutOfOfficeEntry;
