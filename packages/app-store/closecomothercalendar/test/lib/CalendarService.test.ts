import CloseComCalendarService from "@calcom/closecom/lib/CalendarService";
import CloseCom from "@calcom/lib/CloseCom";
import { CalendarEvent } from "@calcom/types/Calendar";

jest.mock("@calcom/lib/CloseCom", () => {
  return class {
    constructor() {
      /* Mock */
    }
  };
});

afterEach(() => {
  jest.resetAllMocks();
});

const mockedCredential = {
  id: 1,
  key: "",
  appId: "",
  type: "",
  userId: 1,
};

// getCloseComGenericLeadId
test("check generic lead generator: already exists", async () => {
  CloseCom.prototype.lead = {
    list: () => ({
      data: [{ name: "From Cal.com", id: "abc" }],
    }),
  } as any;

  const closeComCalendarService = new CloseComCalendarService(mockedCredential);
  const spy = jest.spyOn(closeComCalendarService, "getCloseComGenericLeadId");
  const mockedGetCloseComGenericLeadId = spy.getMockImplementation();
  if (mockedGetCloseComGenericLeadId) {
    const id = await mockedGetCloseComGenericLeadId();
    expect(id).toEqual("abc");
  }
});

// getCloseComGenericLeadId
test("check generic lead generator: doesn't exist", async () => {
  CloseCom.prototype.lead = {
    list: () => ({
      data: [],
    }),
    create: () => ({ id: "def" }),
  } as any;

  const closeComCalendarService = new CloseComCalendarService(mockedCredential);
  const spy = jest.spyOn(closeComCalendarService, "getCloseComGenericLeadId");
  const mockedGetCloseComGenericLeadId = spy.getMockImplementation();
  if (mockedGetCloseComGenericLeadId) {
    const id = await mockedGetCloseComGenericLeadId();
    expect(id).toEqual("def");
  }
});

// getCloseComContactIds
test("retrieve contact IDs: all exist", async () => {
  const attendees = [
    { email: "test1@example.com", id: "test1" },
    { email: "test2@example.com", id: "test2" },
  ];

  const event = {
    attendees,
  } as CalendarEvent;

  CloseCom.prototype.contact = {
    search: () => ({ data: attendees }),
  } as any;

  const closeComCalendarService = new CloseComCalendarService(mockedCredential);
  const spy = jest.spyOn(closeComCalendarService, "getCloseComContactIds");
  const mockedGetCloseComContactIds = spy.getMockImplementation();
  if (mockedGetCloseComContactIds) {
    const contactIds = await mockedGetCloseComContactIds(event, "leadId");
    expect(contactIds).toEqual(["test1", "test2"]);
  }
});

// getCloseComContactIds
test("retrieve contact IDs: some don't exist", async () => {
  const attendees = [{ email: "test1@example.com", id: "test1" }, { email: "test2@example.com" }];

  const event = {
    attendees,
  } as CalendarEvent;

  CloseCom.prototype.contact = {
    search: () => ({ data: [{ emails: [{ email: "test1@example.com" }], id: "test1" }] }),
    create: () => ({ id: "test3" }),
  } as any;

  const closeComCalendarService = new CloseComCalendarService(mockedCredential);
  const spy = jest.spyOn(closeComCalendarService, "getCloseComContactIds");
  const mockedGetCloseComContactIds = spy.getMockImplementation();
  if (mockedGetCloseComContactIds) {
    const contactIds = await mockedGetCloseComContactIds(event, "leadId");
    expect(contactIds).toEqual(["test1", "test3"]);
  }
});

// getCloseComCustomActivityTypeFieldsIds
test("retrieve custom fields for custom activity type: type doesn't exist, no field created", async () => {
  CloseCom.prototype.activity = {
    type: {
      get: () => [],
    },
  } as any;

  CloseCom.prototype.customActivity = {
    type: {
      get: () => ({ data: [] }),
      create: () => ({ id: "type1" }),
    },
  } as any;

  CloseCom.prototype.customField = {
    activity: {
      create: (data: { name: string }) => ({ id: `field${data.name.length}${data.name[0]}` }),
    },
  } as any;

  const closeComCalendarService = new CloseComCalendarService(mockedCredential);
  const spy = jest.spyOn(closeComCalendarService, "getCloseComCustomActivityTypeFieldsIds");
  const mockedGetCloseComCustomActivityTypeFieldsIds = spy.getMockImplementation();
  if (mockedGetCloseComCustomActivityTypeFieldsIds) {
    const contactIds = await mockedGetCloseComCustomActivityTypeFieldsIds();
    expect(contactIds).toEqual({
      activityType: "type1",
      fields: {
        attendee: "field9A",
        dateTime: "field11D",
        timezone: "field9T",
        organizer: "field9O",
        additionalNotes: "field16A",
      },
    });
  }
});
