// The processEvent function needs to be exported for testing
// Change line 34 from:
// const processEvent = (calEvent: CalendarEvent): CalendarServiceEvent => {
// To:
// /**
//  * Process the calendar event by generating description and removing attendees if needed.
//  * @internal Exported for testing purposes
//  */
// export const processEvent = (calEvent: CalendarEvent): CalendarServiceEvent => {