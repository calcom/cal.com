import { ICAL_UID_DOMAIN } from "@calcom/lib/constants";

/**
 * This function returns the iCalUID if a uid is passed or if it is present in the event that is passed
 * @param uid - the uid of the event
 * @param event - an event that already has an iCalUID or one that has a uid
 * @param defaultToEventUid - if true, will default to the event.uid if present
 *
 * @returns the iCalUID whether already present or generated
 */
const getICalUID = ({
  uid,
  event,
  defaultToEventUid,
}: {
  uid?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event?: { iCalUID?: string | null; uid?: string | null; [key: string]: any };
  defaultToEventUid?: boolean;
}) => {
  if (event?.iCalUID) return event.iCalUID;

  if (defaultToEventUid && event?.uid) return `${event.uid}@${ICAL_UID_DOMAIN}`;

  if (uid) return `${uid}@${ICAL_UID_DOMAIN}`;

  return;
};

export default getICalUID;
