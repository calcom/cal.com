import { vi } from "vitest";

// Mock window.matchMedia for jsdom environment
// This needs to be set up before any React components are rendered
const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: matchMediaMock,
});
