import { cn } from "@calid/features/lib/cn";
import { Icon } from "@calid/features/ui/components/icon";

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
  return (
    <div className={cn( isMobile ? "grid grid-cols-1" : "grid gap-6 grid-cols-3")}>
      {/* Sidebar: profile + notes */}
      <div className="space-y-6 flex flex-col ">
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
          "col-span-2 flex flex-col gap-6 max-h-[80vh] mt-6",
          !isMobile && "min-h-0 overflow-hidden mt-0",
          
        )}>
        <MeetingsSection
          title={
            <>
              <Icon name="calendar-days" className="h-4 w-4" /> Upcoming Meetings
            </>
          }
          meetings={upcomingMeetings}
          emptyLabel="No upcoming meetings found for this contact"
          countBadge
          isLoading={meetingsLoading}
          errorMessage={meetingsErrorMessage}
          className={cn(!isMobile && "flex flex-1 overflow-hidden")}
        />

        <MeetingsSection
          title={
            <>
              <Icon name="clock" className="h-4 w-4" /> Meeting History
            </>
          }
          meetings={pastMeetings}
          emptyLabel="No meeting history found for this contact"
          isLoading={meetingsLoading}
          errorMessage={meetingsErrorMessage}
          className={cn(!isMobile && "min-h-0 flex-1 overflow-hidden")}
        />
      </div>
    </div>
  );
};