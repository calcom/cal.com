import { vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

export const fetchMocker = createFetchMock(vi);

// sets globalThis.fetch and globalThis.fetchMock to our mocked version
fetchMocker.enableMocks();
