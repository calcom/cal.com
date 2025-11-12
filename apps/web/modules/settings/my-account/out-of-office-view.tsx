"use client";

import { useEffect, useState } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

import OutOfOfficeEntriesList from "@calcom/features/settings/outOfOffice/OutOfOfficeEntriesList";
import { CreateOrEditOutOfOfficeEntryModal } from "@calcom/features/settings/outOfOffice/CreateOrEditOutOfOfficeModal";
import type { BookingRedirectForm } from "@calcom/features/settings/outOfOffice/CreateOrEditOutOfOfficeModal";

export default function OutOfOfficeView() {
  const [openModal, setOpenModal] = useState(false);
  const [currentlyEditingOutOfOfficeEntry, setCurrentlyEditingOutOfOfficeEntry] =
    useState<BookingRedirectForm | null>(null);

  const params = useCompatSearchParams();
  const openModalOnStart = !!params?.get("om");

  useEffect(() => {
    if (openModalOnStart) {
      setOpenModal(true);
    }
  }, [openModalOnStart]);

  const handleOpenCreateDialog = () => {
    setCurrentlyEditingOutOfOfficeEntry(null);
    setOpenModal(true);
  };

  const handleOpenEditDialog = (entry: BookingRedirectForm) => {
    setCurrentlyEditingOutOfOfficeEntry(entry);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setCurrentlyEditingOutOfOfficeEntry(null);
  };

  return (
    <>
      <OutOfOfficeEntriesList
        onOpenCreateDialog={handleOpenCreateDialog}
        onOpenEditDialog={handleOpenEditDialog}
      />
      {openModal && (
        <CreateOrEditOutOfOfficeEntryModal
          openModal={openModal}
          closeModal={handleCloseModal}
          currentlyEditingOutOfOfficeEntry={currentlyEditingOutOfOfficeEntry}
        />
      )}
    </>
  );
}

