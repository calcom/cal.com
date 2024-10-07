"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

import { useTranslations } from "@calcom/lib/i18n/hooks/useTranslations";
import { Button, Icon } from "@calcom/ui";

import { CreateOrEditOutOfOfficeEntryModal } from "./CreateOrEditOutOfOfficeModal";

const CreateNewOutOfOfficeEntry = () => {
  const t = useTranslations();

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
        />
      )}
    </>
  );
};

export default CreateNewOutOfOfficeEntry;
