import type { Contact, ContactDraft } from "../types";
import { AddEditContactModal } from "./AddEditContactModal";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal";
import { ShareAvailabilityModal } from "./ShareAvailabilityModal";

interface ContactDetailModalsProps {
  contact: Contact;
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
  onSaveContact: (draft: ContactDraft) => Promise<void>;
  isSubmittingContact: boolean;
  editErrorMessage: string | null;
  shareOpen: boolean;
  onShareOpenChange: (open: boolean) => void;
  scheduleOpen: boolean;
  onScheduleOpenChange: (open: boolean) => void;
}

export const ContactDetailModals = ({
  contact,
  editOpen,
  onEditOpenChange,
  onSaveContact,
  isSubmittingContact,
  editErrorMessage,
  shareOpen,
  onShareOpenChange,
  scheduleOpen,
  onScheduleOpenChange,
}: ContactDetailModalsProps) => {
  return (
    <>
      <AddEditContactModal
        open={editOpen}
        onOpenChange={onEditOpenChange}
        contact={contact}
        onSave={onSaveContact}
        isSubmitting={isSubmittingContact}
        errorMessage={editErrorMessage}
      />
      <ShareAvailabilityModal open={shareOpen} onOpenChange={onShareOpenChange} contact={contact} />
      <ScheduleMeetingModal open={scheduleOpen} onOpenChange={onScheduleOpenChange} contact={contact} />
    </>
  );
};
