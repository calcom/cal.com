import CloseComCalendarService from "@calcom/closecom/lib/CalendarService";
import CloseCom from "@calcom/lib/CloseCom";

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

test("check generic lead generator: already exists", async () => {
  CloseCom.prototype.lead = {
    list: () => ({
      data: [{ name: "From Cal.com", id: "abc" }],
    }),
  } as any;
  const closeComCalendarService = new CloseComCalendarService(mockedCredential);
  const spy = jest.spyOn(closeComCalendarService, "getCloseComGenericLeadId");
  const getSumImplementation = spy.getMockImplementation();
  if (getSumImplementation) {
    const id = await getSumImplementation();
    expect(id).toEqual("abc");
  }
});

test("check generic lead generator: doesn't exist", async () => {
  CloseCom.prototype.lead = {
    list: () => ({
      data: [],
    }),
    create: () => ({ id: "def" }),
  } as any;
  const closeComCalendarService = new CloseComCalendarService(mockedCredential);
  const spy = jest.spyOn(closeComCalendarService, "getCloseComGenericLeadId");
  const getSumImplementation = spy.getMockImplementation();
  if (getSumImplementation) {
    const id = await getSumImplementation();
    expect(id).toEqual("def");
  }
});
