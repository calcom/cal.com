import matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, expect, vi } from "vitest";

// For next.js webapp compponent that use "preserve" for jsx in tsconfig.json
global.React = React;

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    span: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
  useReducedMotion: () => false,
  useAnimate: () => [null, vi.fn()],
}));

// Add new mocks
vi.mock("next-seo", () => ({
  NextSeo: () => null,
  LogoJsonLd: () => null,
}));

vi.mock("@calcom/features/ee/organizations/hooks", () => ({
  useOrgBrandingValues() {
    return {};
  },
}));

vi.mock("react-sticky-box", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="sticky-box">{children}</div>,
}));

vi.mock("@calcom/features/ee/organizations/context/provider", () => ({
  useOrgBranding() {
    return {};
  },
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

vi.mock("@calcom/atoms/hooks/useIsPlatform", () => ({
  useIsPlatform: () => {
    return false;
  },
}));

vi.mock("@calcom/features/eventtypes/lib/getEventTypesByViewer", () => ({}));
vi.mock("@calcom/features/eventtypes/lib/getEventTypesPublic", () => ({}));
vi.mock("@calcom/ui/classNames", () => ({
  default: (...args: string[]) => {
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
