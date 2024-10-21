"use client";

import type { SetStateAction, Dispatch } from "react";
import { useState, useEffect } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon } from "@calcom/ui";

import { CreateOrEditOutOfOfficeEntryModal } from "./CreateOrEditOutOfOfficeModal";

const CreateNewOutOfOfficeEntry = ({
  setOOOEntriesAdded,
}: {
  setOOOEntriesAdded: Dispatch<SetStateAction<number>>;
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
        className="flex items-center justify-between px-4"
        onClick={() => setOpenModal(true)}
        data-testid="add_entry_ooo">
        <Icon name="plus" size={16} /> {t("add")}
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
