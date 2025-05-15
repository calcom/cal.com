import { vi } from "vitest";

vi.mock("../EventMeta", () => ({
  EventMeta: () => {
    return (
      <div>
        <h2>Test Event</h2>
        <p>Test Description</p>
        <div>
          <span>30 minutes</span>
          <span>Free</span>
        </div>
      </div>
    );
  },
}));
