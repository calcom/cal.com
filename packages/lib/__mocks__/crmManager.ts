import { vi } from "vitest";

class MockCrmManager {
  createEvent = vi.fn();
  updateEvent = vi.fn();
  deleteEvent = vi.fn();
}

export default MockCrmManager; 