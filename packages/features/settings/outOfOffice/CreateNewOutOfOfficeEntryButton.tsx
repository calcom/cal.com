"use client";

import { useSearchParams } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon } from "@calcom/ui";

import { CreateOrEditOutOfOfficeEntryModal } from "./CreateOrEditOutOfOfficeModal";

const CreateNewOutOfOfficeEntry = ({
  setOOOEntriesAdded,
}: {
  setOOOEntriesAdded: Dispatch<SetStateAction<number>> | null;
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
        className="flex w-20 items-center justify-between px-4"
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
          setOOOEntriesUpdated={null}
          setOOOEntriesAdded={setOOOEntriesAdded}
        />
      )}
    </>
  );
};

export default CreateNewOutOfOfficeEntry;
