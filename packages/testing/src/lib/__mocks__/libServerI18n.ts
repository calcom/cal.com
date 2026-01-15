import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as i18n from "@calcom/lib/server/i18n";

vi.mock("@calcom/lib/server/i18n", () => i18nMock);

beforeEach(() => {
  mockReset(i18nMock);
});

const i18nMock = mockDeep<typeof i18n>();
export default i18nMock;
