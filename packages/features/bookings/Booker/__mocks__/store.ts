import { vi } from "vitest";

const mockStore = {
  state: {
    username: "",
    eventSlug: "",
    eventId: undefined,
    layout: "month_view",
    month: undefined,
    bookingUid: null,
    isTeamEvent: false,
    bookingData: null,
    verifiedEmail: null,
    rescheduleUid: null,
    rescheduledBy: null,
    seatReferenceUid: undefined,
    durationConfig: null,
    org: null,
    isInstantMeeting: false,
    timezone: null,
    teamMemberEmail: null,
    crmOwnerRecordType: null,
    crmAppSlug: null,
  },
  setSelectedDate: vi.fn(),
  setMonth: vi.fn(),
  setTimeFormat: vi.fn(),
  setLayout: vi.fn(),
  setVerifiedEmail: vi.fn(),
  setState: vi.fn(),
};

vi.mock("../store", () => ({
  useBookerStore: vi.fn(() => mockStore),
}));

export default mockStore;
