import matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession() {
    return {};
  },
}));

vi.mock("@calcom/features/ee/organizations/hooks", () => ({
  useOrgBrandingValues() {
    return {};
  },
}));

vi.mock("@calcom/features/ee/organizations/context/provider", () => ({
  useOrgBranding() {
    return {};
  },
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {},
}));

vi.mock("next/navigation", async () => ({
  ...((await vi.importActual("next/navigation")) as object),
  useRouter() {
    return {
      route: "/",
      pathname: "",
      query: {},
      asPath: "",
      push: vi.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

vi.mock("@calcom/lib/OgImages", async () => {
  return {};
});

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => {
    return {
      t: (str: string) => str,
      isLocaleReady: true,
      i18n: {
        language: "en",
        defaultLocale: "en",
        locales: ["en"],
        exists: () => false,
      },
    };
  },
}));

vi.mock("@calcom/atoms/monorepo", () => ({
  useIsPlatform: () => {
    return false;
  },
}));

vi.mock("@calcom/lib/event-types/getEventTypesByViewer", () => ({}));
vi.mock("@calcom/lib/event-types/getEventTypesPublic", () => ({}));
vi.mock("@calcom/lib", () => ({
  classNames: (...args: string[]) => {
    return args.filter(Boolean).join(" ");
  },
}));

expect.extend({
  tabToBeDisabled(received) {
    const isDisabled = received.classList.contains("pointer-events-none");
    return {
      pass: isDisabled,
      message: () => `Expected tab to be disabled`,
    };
  },
});

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
