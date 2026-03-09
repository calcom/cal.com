import type { TFunction } from "i18next";
import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as getTranslation from "@calcom/i18n/server";

vi.mock("@calcom/i18n/server", () => getTranslationMock);

beforeEach(() => {
  mockReset(getTranslationMock);
});

const getTranslationMock = mockDeep<typeof getTranslation>();

export const mock = {
  fakeIdentityFn: () =>
    getTranslationMock.getTranslation.mockImplementation(
      async () => ((key: string) => key) as TFunction<string, undefined>
    ),
};

export default getTranslationMock;
