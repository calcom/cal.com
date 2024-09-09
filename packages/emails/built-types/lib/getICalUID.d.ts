/**
 * This function returns the iCalUID if a uid is passed or if it is present in the event that is passed
 * @param uid - the uid of the event
 * @param event - an event that already has an iCalUID or one that has a uid
 * @param defaultToEventUid - if true, will default to the event.uid if present
 *
 * @returns the iCalUID whether already present or generated
 */
declare const getICalUID: ({ uid, event, defaultToEventUid, attendeeId, }: {
    uid?: string | undefined;
    event?: {
        [key: string]: any;
        iCalUID?: string | null | undefined;
        uid?: string | null | undefined;
    } | undefined;
    defaultToEventUid?: boolean | undefined;
    attendeeId?: number | undefined;
}) => string;
export default getICalUID;
//# sourceMappingURL=getICalUID.d.ts.map