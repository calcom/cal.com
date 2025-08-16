import matchers from "@testing-library/jest-dom/matchers";
import ResizeObserver from "resize-observer-polyfill";
import { vi, expect } from "vitest";
import createFetchMock from "vitest-fetch-mock";

global.ResizeObserver = ResizeObserver;
const fetchMocker = createFetchMock(vi);

// sets globalThis.fetch and globalThis.fetchMock to our mocked version
fetchMocker.enableMocks();

expect.extend(matchers);

vi.mock("@calcom/exchangecalendar/lib/CalendarService", () => ({
  default: class MockExchangeCalendarService {
    constructor() {}
    async createEvent() {
      return { uid: "mock", id: "mock", password: "", type: "", url: "", additionalInfo: {} };
    }
    async updateEvent() {
      return { uid: "mock", id: "mock", password: "", type: "", url: "", additionalInfo: {} };
    }
    async deleteEvent() {}
    async getAvailability() {
      return [];
    }
    async listCalendars() {
      return [];
    }
  },
}));
