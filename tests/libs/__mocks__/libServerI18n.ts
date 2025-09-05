import type * as i18n from "@calcom/lib/server/i18n";
import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

vi.mock("@calcom/lib/server/i18n", () => i18nMock);

beforeEach(() => {
  mockReset(i18nMock);
});

const i18nMock = mockDeep<typeof i18n>();
export default i18nMock;
