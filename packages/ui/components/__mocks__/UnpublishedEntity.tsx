import { vi } from "vitest";

vi.mock("../unpublished-entity", () => ({
  UnpublishedEntity: () => <div data-testid="unpublished-entity">Mock Unpublished Entity</div>,
}));
