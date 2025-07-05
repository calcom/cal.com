import type { ISettledResponse } from "office365calendar/lib/CalendarService";

interface IGetEventsBatchMockResponse {
  endDateTime?: string;
  startDateTime?: string;
  calendarIds: string[];
}

function getEventsBatchMockResponse(config: IGetEventsBatchMockResponse): ISettledResponse[] {
  return config.calendarIds?.map((calId, index) => ({
    id: `${index}`,
    body: {
      value: [
        {
          id: calId,
          end: {
            dateTime: config.endDateTime || "2025-05-02T07:30:00.0000000",
            timeZone: "UTC",
          },
          start: {
            dateTime: config.startDateTime || "2025-05-02T07:00:00.0000000",
            timeZone: "UTC",
          },
          showAs: "busy",
          "@odata.etag": 'W/"Wz6uxrnAKUWCfrn23GUlUQAIDskjFg=="',
        },
      ],
      "@odata.context":
        "https://graph.microsoft.com/v1.0/$metadata#users('example%40cal.com')/calendars('calendar1%40test.com')/calendarView(showAs,start,end)",
    },
    status: 200,
    headers: {
      "Content-Type":
        "application/json; odata.metadata=minimal; odata.streaming=true; IEEE754Compatible=false; charset=utf-8",
      "Retry-After": "0",
    },
  }));
}

const eventsBatchMockResponse: ISettledResponse[] = [
  {
    id: "0",
    body: {
      value: [
        {
          id: "calendar1%40test.com",
          end: {
            dateTime: "2025-05-02T07:30:00.0000000",
            timeZone: "UTC",
          },
          start: {
            dateTime: "2025-05-02T07:00:00.0000000",
            timeZone: "UTC",
          },
          showAs: "busy",
          "@odata.etag": 'W/"Wz6uxrnAKUWCfrn23GUlUQAIDskjFg=="',
        },
      ],
      "@odata.context":
        "https://graph.microsoft.com/v1.0/$metadata#users('example%40cal.com')/calendars('calendar1%40test.com')/calendarView(showAs,start,end)",
    },
    status: 200,
    headers: {
      "Content-Type":
        "application/json; odata.metadata=minimal; odata.streaming=true; IEEE754Compatible=false; charset=utf-8",
      "Retry-After": "0",
    },
  },
];

export { eventsBatchMockResponse, getEventsBatchMockResponse };
