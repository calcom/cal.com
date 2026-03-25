import { cn } from "@calid/features/lib/cn";
import { Icon } from "@calid/features/ui/components/icon";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { Contact, ContactMeeting } from "../types";
import { ContactNotesCard } from "./ContactNotesCard";
import { ContactProfileCard } from "./ContactProfileCard";
import { MeetingsSection } from "./MeetingsSection";

interface ContactDetailLayoutProps {
  contact: Contact;
  isMobile: boolean;
  upcomingMeetings: ContactMeeting[];
  pastMeetings: ContactMeeting[];
  meetingsLoading: boolean;
  meetingsErrorMessage: string | null;
  notes: string;
  onNotesChange: (value: string) => void;
  onSaveNotes: () => Promise<void> | void;
  notesHasChanges: boolean;
  notesSaveErrorMessage: string | null;
  isSavingNotes: boolean;
  onEditContact: () => void;
  onShareAvailability: () => void;
  onScheduleMeeting: () => void;
  onDeleteContact: () => Promise<void> | void;
  isDeletingContact: boolean;
  deleteErrorMessage: string | null;
}

export const ContactDetailLayout = ({
  contact,
  isMobile,
  upcomingMeetings,
  pastMeetings,
  meetingsLoading,
  meetingsErrorMessage,
  notes,
  onNotesChange,
  onSaveNotes,
  notesHasChanges,
  notesSaveErrorMessage,
  isSavingNotes,
  onEditContact,
  onShareAvailability,
  onScheduleMeeting,
  onDeleteContact,
  isDeletingContact,
  deleteErrorMessage,
}: ContactDetailLayoutProps) => {
  const { t } = useLocale();

  return (
    <div className={cn(isMobile ? "grid grid-cols-1" : "grid grid-cols-3 gap-6")}>
      {/* Sidebar: profile + notes */}
      <div className="flex flex-col space-y-6 ">
        <ContactProfileCard
          contact={contact}
          onEdit={onEditContact}
          onShare={onShareAvailability}
          onSchedule={onScheduleMeeting}
          onDelete={onDeleteContact}
          isDeleting={isDeletingContact}
          deleteErrorMessage={deleteErrorMessage}
        />

        <ContactNotesCard
          notes={notes}
          onNotesChange={onNotesChange}
          hasChanges={notesHasChanges}
          onSave={onSaveNotes}
          isSaving={isSavingNotes}
          saveErrorMessage={notesSaveErrorMessage}
        />
      </div>

      {/* Main: meetings */}
      <div
        className={cn(
          "col-span-2 mt-6 flex max-h-[80vh] flex-col gap-6",
          !isMobile && "mt-0 min-h-0 overflow-hidden"
        )}>
        <MeetingsSection
          title={
            <>
              <Icon name="calendar-days" className="h-4 w-4" /> {t("contacts_upcoming_meetings")}
            </>
          }
          meetings={upcomingMeetings}
          emptyLabel={t("contacts_no_upcoming_meetings_found")}
          countBadge
          isLoading={meetingsLoading}
          errorMessage={meetingsErrorMessage}
          className={cn(!isMobile && "flex flex-1 overflow-hidden")}
        />

        <MeetingsSection
          title={
            <>
              <Icon name="clock" className="h-4 w-4" /> {t("contacts_meeting_history")}
            </>
          }
          meetings={pastMeetings}
          emptyLabel={t("contacts_no_meeting_history_found")}
          isLoading={meetingsLoading}
          errorMessage={meetingsErrorMessage}
          className={cn(!isMobile && "min-h-0 flex-1 overflow-hidden")}
        />
      </div>
    </div>
  );
};
