import matchers from "@testing-library/jest-dom/matchers";
import ResizeObserver from "resize-observer-polyfill";
import { vi, expect } from "vitest";
import createFetchMock from "vitest-fetch-mock";

// Mock the app registry module for all tests
// This creates a mockable seam for the upcoming dynamic loading refactor
vi.mock("@calcom/lib/apps/registry", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("@calcom/lib/apps/registry")>();
  return {
    ...originalModule,
    // We spy on the functions to allow for per-test overrides if needed,
    // while defaulting to the original implementation.
    getEventTypeAddonMap: vi.fn(originalModule.getEventTypeAddonMap),
    getEventTypeSettingsMap: vi.fn(originalModule.getEventTypeSettingsMap),
    getAppSettingsComponentsMap: vi.fn(originalModule.getAppSettingsComponentsMap),
    getInstallAppButtonMap: vi.fn(originalModule.getInstallAppButtonMap),
    getAppSetupMap: vi.fn(originalModule.getAppSetupMap),
  };
});

global.ResizeObserver = ResizeObserver;
const fetchMocker = createFetchMock(vi);

// sets globalThis.fetch and globalThis.fetchMock to our mocked version
fetchMocker.enableMocks();

expect.extend(matchers);
