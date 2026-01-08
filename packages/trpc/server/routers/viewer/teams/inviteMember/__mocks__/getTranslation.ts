import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as getTranslation from "@calcom/lib/server/i18n";

vi.mock("@calcom/lib/server/i18n", () => getTranslationMock);

beforeEach(() => {
  mockReset(getTranslationMock);
});

const getTranslationMock = mockDeep<typeof getTranslation>();

export const mock = {
  fakeIdentityFn: () =>
    getTranslationMock.getTranslation.mockImplementation(async () => (key: string) => key),
};

export default getTranslationMock;
