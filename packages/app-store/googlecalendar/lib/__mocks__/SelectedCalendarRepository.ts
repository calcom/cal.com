import { vi } from "vitest";

const selectedCalendarRepositoryModuleMock = {
  SelectedCalendarRepository: vi.fn().mockImplementation(() => ({
    isCacheReadyForCredential: vi.fn().mockResolvedValue(true),
  })),
};

vi.mock("@calcom/lib/server/repository/SelectedCalendarRepository", () => selectedCalendarRepositoryModuleMock);
