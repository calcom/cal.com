"use client";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useEffect, useState } from "react";
import { CreateOrEditOutOfOfficeEntryModal } from "~/settings/outOfOffice/CreateOrEditOutOfOfficeModal";
import OutOfOfficeEntriesList from "~/settings/outOfOffice/OutOfOfficeEntriesList";
import { OutOfOfficeTab } from "~/settings/outOfOffice/OutOfOfficeToggleGroup";
import type { BookingRedirectForm } from "~/settings/outOfOffice/types";
import { HolidaysView } from "./holidays-view";

export default function OutOfOfficeView() {
  const [openModal, setOpenModal] = useState(false);
  const [currentlyEditingOutOfOfficeEntry, setCurrentlyEditingOutOfOfficeEntry] =
    useState<BookingRedirectForm | null>(null);

  const params = useCompatSearchParams();
  const openModalOnStart = !!params?.get("om");
  const selectedTab = params?.get("type") ?? OutOfOfficeTab.MINE;

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

  // Show HolidaysView when holidays tab is selected
  if (selectedTab === OutOfOfficeTab.HOLIDAYS) {
    return <HolidaysView />;
  }

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
