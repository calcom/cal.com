// Import the video adapters mock to ensure it's loaded
import "./tests/libs/__mocks__/video-adapters";

import matchers from "@testing-library/jest-dom/matchers";
import ResizeObserver from "resize-observer-polyfill";
import { vi, expect } from "vitest";
import createFetchMock from "vitest-fetch-mock";

global.ResizeObserver = ResizeObserver;
const fetchMocker = createFetchMock(vi);

// sets globalThis.fetch and globalThis.fetchMock to our mocked version
fetchMocker.enableMocks();

expect.extend(matchers);

class MockExchangeCalendarService implements CalendarService {
  constructor() {}
  async createEvent() {
    return {
      uid: "mock",
      id: "mock",
      password: "",
      type: "",
      url: "",
      additionalInfo: {},
    };
  }
  async updateEvent() {
    return {
      uid: "mock",
      id: "mock",
      password: "",
      type: "",
      url: "",
      additionalInfo: {},
    };
  }
  async deleteEvent() {}
  async getAvailability() {
    return [];
  }
  async listCalendars() {
    return [];
  }
}

vi.mock("@calcom/exchangecalendar/lib/CalendarService", () => ({
  default: MockExchangeCalendarService,
}));

vi.mock("@calcom/exchange2013calendar/lib/CalendarService", () => ({
  default: MockExchangeCalendarService,
}));

vi.mock("@calcom/exchange2016calendar/lib/CalendarService", () => ({
  default: MockExchangeCalendarService,
}));
