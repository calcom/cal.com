import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { vi, beforeEach, afterEach } from "vitest";

const cleanup = async () => {
  await prismock.eventType.deleteMany();
  await prismock.user.deleteMany();
  await prismock.schedule.deleteMany();
  await prismock.selectedCalendar.deleteMany();
  await prismock.credential.deleteMany();
  await prismock.booking.deleteMany();
  await prismock.app.deleteMany();
  vi.useRealTimers();
};

export function setupAndTeardown() {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });
}
