import type {
  Contact,
  ContactCreateInput,
  ContactDraft,
  ContactMeeting,
  ContactMeetingRow,
  ContactRow,
  ContactUpdateInput,
} from "../types";
import { getContactInitials, getContactSecondaryPhones } from "../utils/contactUtils";

const parseDate = (value: Date | string) => {
  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
};

export const mapContactRowToContact = (row: ContactRow): Contact => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  secondaryPhones: getContactSecondaryPhones(row.metadata, row.phone),
  notes: row.notes,
  avatar: getContactInitials(row.name),
  createdAt: parseDate(row.createdAt),
  updatedAt: parseDate(row.updatedAt),
  lastMeeting: row.lastMeetingAt ? parseDate(row.lastMeetingAt) : null,
});

export const mapContactDraftToCreateInput = (draft: ContactDraft): ContactCreateInput => ({
  name: draft.name.trim(),
  email: draft.email.trim(),
  phone: draft.phone.trim(),
  notes: draft.notes.trim(),
});

export const mapContactDraftToUpdateInput = (draft: ContactDraft): ContactUpdateInput => ({
  id: (() => {
    if (draft.id === undefined) {
      throw new Error("Missing contact id for update");
    }

    return draft.id;
  })(),
  name: draft.name.trim(),
  email: draft.email.trim(),
  phone: draft.phone.trim(),
  notes: draft.notes.trim(),
});

export const mapContactMeetingRowToContactMeeting = (
  contactId: number,
  meeting: ContactMeetingRow
): ContactMeeting => ({
  id: meeting.id,
  instanceId: meeting.instanceId,
  contactId,
  title: meeting.title,
  date: parseDate(meeting.date),
  duration: meeting.duration,
  status: meeting.status,
  notes: meeting.notes ?? undefined,
  meetingLink: meeting.meetingLink ?? undefined,
});
