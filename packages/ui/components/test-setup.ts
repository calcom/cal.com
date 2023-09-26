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
    };
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

/**
 * JSDOM doesn't implement PointerEvent so we need to mock our own implementation.
 * Default to mouse left click interaction
 * @link https://github.com/radix-ui/primitives/issues/1207
 * @link https://github.com/jsdom/jsdom/pull/2666
 */
class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;

  constructor(type: string, props: PointerEventInit) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.pointerType = props.pointerType || "mouse";
  }
}

window.PointerEvent = MockPointerEvent as any;

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
