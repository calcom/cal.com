import { mockDeep } from "vitest-mock-extended";

export const mockDeepHelper = <T>(mockFnName = "") =>
  mockDeep<T>({
    fallbackMockImplementation: () => {
      throw new Error(
        `Unimplemented ${mockFnName}. You seem to have not mocked the app that you are trying to use`
      );
    },
  });
