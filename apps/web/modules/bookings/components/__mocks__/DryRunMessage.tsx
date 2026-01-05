import { vi } from "vitest";

vi.mock("../DryRunMessage", () => ({
  DryRunMessage: () => <div data-testid="dry-run-message">Mock Dry Run Message</div>,
}));
