"use client";

import { useEffect, useState } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { trpc } from "@calcom/trpc/react";

import { CreateOrEditOutOfOfficeEntryModal } from "@calcom/features/settings/outOfOffice/CreateOrEditOutOfOfficeModal";
import type { BookingRedirectForm } from "@calcom/features/settings/outOfOffice/CreateOrEditOutOfOfficeModal";
import { GoogleCalendarOOOSyncModal } from "@calcom/features/settings/outOfOffice/GoogleCalendarOOOSyncModal";
import { OOOTypeSelectionModal } from "@calcom/features/settings/outOfOffice/OOOTypeSelectionModal";
import OutOfOfficeEntriesList from "@calcom/features/settings/outOfOffice/OutOfOfficeEntriesList";
import { OutOfOfficeTab } from "@calcom/features/settings/outOfOffice/OutOfOfficeToggleGroup";
import { HolidaysView } from "./holidays-view";

export default function OutOfOfficeView() {
  const [openModal, setOpenModal] = useState(false);
  const [openTypeSelectionModal, setOpenTypeSelectionModal] = useState(false);
  const [openGoogleSyncModal, setOpenGoogleSyncModal] = useState(false);
  const [currentlyEditingOutOfOfficeEntry, setCurrentlyEditingOutOfOfficeEntry] =
    useState<BookingRedirectForm | null>(null);

  const params = useCompatSearchParams();
  const openModalOnStart = !!params?.get("om");
  const selectedTab = params?.get("type") ?? OutOfOfficeTab.MINE;

  const { data: syncStatus } = trpc.viewer.ooo.getOOOSyncStatus.useQuery();

  useEffect(() => {
    if (openModalOnStart) {
      setOpenModal(true);
    }
  }, [openModalOnStart]);

  const handleOpenCreateDialog = () => {
    setCurrentlyEditingOutOfOfficeEntry(null);
    // If user has Google Calendar connected, show type selection first
    if (syncStatus?.hasGoogleCalendar) {
      setOpenTypeSelectionModal(true);
    } else {
      setOpenModal(true);
    }
  };

  const handleOpenEditDialog = (entry: BookingRedirectForm) => {
    setCurrentlyEditingOutOfOfficeEntry(entry);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setCurrentlyEditingOutOfOfficeEntry(null);
  };

  const handleSelectOneOff = () => {
    setOpenTypeSelectionModal(false);
    setCurrentlyEditingOutOfOfficeEntry(null);
    setOpenModal(true);
  };

  const handleSelectGoogleSync = () => {
    setOpenTypeSelectionModal(false);
    setOpenGoogleSyncModal(true);
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

      {openTypeSelectionModal && (
        <OOOTypeSelectionModal
          open={openTypeSelectionModal}
          onClose={() => setOpenTypeSelectionModal(false)}
          onSelectOneOff={handleSelectOneOff}
          onSelectGoogleSync={handleSelectGoogleSync}
        />
      )}

      {openGoogleSyncModal && (
        <GoogleCalendarOOOSyncModal
          open={openGoogleSyncModal}
          onClose={() => setOpenGoogleSyncModal(false)}
        />
      )}

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

