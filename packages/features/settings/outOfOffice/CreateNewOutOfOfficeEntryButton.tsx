"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ButtonProps } from "@calcom/ui";
import { Button } from "@calcom/ui";

import { CreateOrEditOutOfOfficeEntryModal } from "./CreateOrEditOutOfOfficeModal";

const CreateNewOutOfOfficeEntry = ({
  size,
  ...rest
}: {
  size?: ButtonProps["size"];
  "data-testid"?: string;
}) => {
  const { t } = useLocale();

  const params = useSearchParams();
  const openModalOnStart = !!params?.get("om");
  useEffect(() => {
    if (openModalOnStart) {
      setOpenModal(true);
    }
  }, [openModalOnStart]);

  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <Button
        color="primary"
        size={size ?? "base"}
        className="flex items-center justify-between px-4"
        StartIcon="plus"
        onClick={() => setOpenModal(true)}
        data-testid={rest["data-testid"]}>
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
