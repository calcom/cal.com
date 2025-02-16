"use client";

import type { SetStateAction, Dispatch } from "react";
import { useState, useEffect } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ButtonProps } from "@calcom/ui";
import { Button } from "@calcom/ui";

import { CreateOrEditOutOfOfficeEntryModal } from "./CreateOrEditOutOfOfficeModal";

const CreateNewOutOfOfficeEntry = ({
  size,
  setOOOEntriesAdded,
  ...rest
}: {
  size?: ButtonProps["size"];
  "data-testid"?: string;
  setOOOEntriesAdded?: Dispatch<SetStateAction<number>>;
}) => {
  const { t } = useLocale();

  const searchParams = useCompatSearchParams();
  const [openModal, setOpenModal] = useState(false);

  const openModalOnStart = !!searchParams?.get("om");
  useEffect(() => {
    if (openModalOnStart) {
      setOpenModal(true);
    }
  }, [openModalOnStart]);

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
          setOOOEntriesAdded={setOOOEntriesAdded}
        />
      )}
    </>
  );
};

export default CreateNewOutOfOfficeEntry;
