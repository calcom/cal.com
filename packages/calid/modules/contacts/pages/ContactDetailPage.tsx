"use client";

import { triggerToast } from "@calid/features/ui/components/toast";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { trpc } from "@calcom/trpc/react";

import { ContactDetailLayout } from "../components/ContactDetailLayout";
import { ContactDetailModals } from "../components/ContactDetailModals";
import {
  ContactDetailErrorState,
  ContactDetailInvalidState,
  ContactDetailLoadingState,
  ContactDetailNotFoundState,
} from "../components/ContactDetailStateViews";
import { useContactDetailUiState } from "../hooks/useContactDetailUiState";
import {
  mapContactDraftToUpdateInput,
  mapContactMeetingRowToContactMeeting,
  mapContactRowToContact,
} from "../mappers/contactMappers";
import type { ContactDraft, ContactMeeting } from "../types";

interface ContactDetailPageProps {
  contactId: string;
}

const sortMeetingsByStartTimeDesc = (first: ContactMeeting, second: ContactMeeting) => {
  const timeDiff = second.date.getTime() - first.date.getTime();
  if (timeDiff !== 0) {
    return timeDiff;
  }

  return second.id - first.id;
};

const ContactDetailPage = ({ contactId }: ContactDetailPageProps) => {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isMobile = useMediaQuery("(max-width: 1023px)");

  const numericContactId = Number(contactId);
  const hasValidContactId = Number.isInteger(numericContactId) && numericContactId > 0;

  const contactQuery = trpc.viewer.calIdContacts.getById.useQuery(
    { id: numericContactId },
    {
      enabled: hasValidContactId,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const contact = useMemo(
    () => (contactQuery.data ? mapContactRowToContact(contactQuery.data) : null),
    [contactQuery.data]
  );

  const meetingsQuery = trpc.viewer.calIdContacts.getMeetingsByContactId.useQuery(
    {
      contactId: numericContactId,
    },
    {
      enabled: hasValidContactId && Boolean(contactQuery.data),
      refetchOnWindowFocus: false,
    }
  );

  const meetings = useMemo(
    () =>
      (meetingsQuery.data?.rows ?? [])
        .map((meeting) => mapContactMeetingRowToContactMeeting(numericContactId, meeting))
        .sort(sortMeetingsByStartTimeDesc),
    [meetingsQuery.data?.rows, numericContactId]
  );
  const currentTime = Date.now();
  const upcomingMeetings = useMemo(
    () => meetings.filter((meeting) => meeting.status === "upcoming").sort(sortMeetingsByStartTimeDesc),
    [meetings]
  );
  const pastMeetings = useMemo(
    () =>
      meetings
        .filter(
          (meeting) =>
            meeting.status !== "upcoming" &&
            meeting.date.getTime() + meeting.duration * 60 * 1000 < currentTime
        )
        .sort(sortMeetingsByStartTimeDesc),
    [meetings]
  );

  const {
    notes,
    editOpen,
    shareOpen,
    scheduleOpen,
    editErrorMessage,
    deleteErrorMessage,
    notesErrorMessage,
    setEditErrorMessage,
    setDeleteErrorMessage,
    setNotesErrorMessage,
    handleEditOpenChange,
    handleNotesChange,
    setShareOpen,
    setScheduleOpen,
  } = useContactDetailUiState({
    contactId: contact?.id,
    initialNotes: contact?.notes ?? "",
  });

  const updateContactMutation = trpc.viewer.calIdContacts.update.useMutation({
    async onSuccess(updatedContact) {
      await Promise.all([
        utils.viewer.calIdContacts.list.invalidate(),
        utils.viewer.calIdContacts.getById.invalidate({ id: updatedContact.id }),
      ]);
    },
  });

  const deleteContactMutation = trpc.viewer.calIdContacts.delete.useMutation({
    async onSuccess() {
      await utils.viewer.calIdContacts.list.invalidate();
      triggerToast("Contact deleted", "success");
      router.push("/contacts");
    },
  });

  const handleBackToContacts = () => {
    router.push("/contacts");
  };

  if (!hasValidContactId) {
    return <ContactDetailInvalidState onBack={handleBackToContacts} />;
  }

  if (contactQuery.isLoading) {
    return <ContactDetailLoadingState />;
  }

  if (contactQuery.error?.data?.code === "NOT_FOUND") {
    return <ContactDetailNotFoundState onBack={handleBackToContacts} />;
  }

  if (contactQuery.isError) {
    return (
      <ContactDetailErrorState
        message={contactQuery.error.message}
        onRetry={() => {
          void contactQuery.refetch();
        }}
      />
    );
  }

  if (!contact) {
    return null;
  }

  const handleDelete = async () => {
    setDeleteErrorMessage(null);

    try {
      await deleteContactMutation.mutateAsync({ id: contact.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete contact";
      setDeleteErrorMessage(message);
      triggerToast(message, "error");
    }
  };

  const handleSaveContact = async (draft: ContactDraft) => {
    setEditErrorMessage(null);

    try {
      await updateContactMutation.mutateAsync(mapContactDraftToUpdateInput(draft));
      triggerToast("Contact updated", "success");
      handleEditOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update contact";
      setEditErrorMessage(message);
      triggerToast(message, "error");
    }
  };

  const handleSaveNotes = async () => {
    setNotesErrorMessage(null);

    try {
      await updateContactMutation.mutateAsync({
        id: contact.id,
        notes,
      });
      triggerToast("Notes saved", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save notes";
      setNotesErrorMessage(message);
      triggerToast(message, "error");
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <ContactDetailLayout
        contact={contact}
        isMobile={isMobile}
        upcomingMeetings={upcomingMeetings}
        pastMeetings={pastMeetings}
        meetingsLoading={meetingsQuery.isLoading}
        meetingsErrorMessage={meetingsQuery.isError ? meetingsQuery.error.message : null}
        notes={notes}
        onNotesChange={handleNotesChange}
        onSaveNotes={handleSaveNotes}
        notesHasChanges={notes !== contact.notes}
        notesSaveErrorMessage={notesErrorMessage}
        isSavingNotes={updateContactMutation.isPending}
        onEditContact={() => handleEditOpenChange(true)}
        onShareAvailability={() => setShareOpen(true)}
        onScheduleMeeting={() => setScheduleOpen(true)}
        onDeleteContact={handleDelete}
        isDeletingContact={deleteContactMutation.isPending}
        deleteErrorMessage={deleteErrorMessage}
      />

      <ContactDetailModals
        contact={contact}
        editOpen={editOpen}
        onEditOpenChange={handleEditOpenChange}
        onSaveContact={handleSaveContact}
        isSubmittingContact={updateContactMutation.isPending}
        editErrorMessage={editErrorMessage}
        shareOpen={shareOpen}
        onShareOpenChange={setShareOpen}
        scheduleOpen={scheduleOpen}
        onScheduleOpenChange={setScheduleOpen}
      />
    </div>
  );
};

export default ContactDetailPage;