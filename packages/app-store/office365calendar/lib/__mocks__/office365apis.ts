const eventsBatchMockResponse = [
  {
    id: "0",
    body: {
      value: [
        {
          id: "calendar-id-1",
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
        "https://graph.microsoft.com/v1.0/$metadata#users('example%40cal.com')/calendars('calendar-id-1')/calendarView(showAs,start,end)",
    },
    status: 200,
    headers: {
      "Content-Type":
        "application/json; odata.metadata=minimal; odata.streaming=true; IEEE754Compatible=false; charset=utf-8",
      "Cache-Control": "private",
    },
  },
];

export { eventsBatchMockResponse };
