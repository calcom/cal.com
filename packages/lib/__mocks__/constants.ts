import { vi, beforeEach } from "vitest";

import type * as constants from "@calcom/lib/constants";

const mockedConstants = {
  IS_PRODUCTION: false,
  IS_TEAM_BILLING_ENABLED: false,
} as typeof constants;

vi.mock("@calcom/lib/constants", () => {
  return mockedConstants;
});

beforeEach(() => {
  Object.entries(mockedConstants).forEach(([key]) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete mockedConstants[key];
  });
});

export const constantsScenarios = {
  enableTeamBilling: () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    mockedConstants.IS_TEAM_BILLING_ENABLED = true;
  },
};
