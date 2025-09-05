import type * as getTranslation from "@calcom/lib/server/i18n";
import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

vi.mock("@calcom/lib/server/i18n", () => getTranslationMock);

beforeEach(() => {
  mockReset(getTranslationMock);
});

const getTranslationMock = mockDeep<typeof getTranslation>();

export const mock = {
  fakeIdentityFn: () =>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    getTranslationMock.getTranslation.mockImplementation(async () => (key: string) => key),
};

export default getTranslationMock;
