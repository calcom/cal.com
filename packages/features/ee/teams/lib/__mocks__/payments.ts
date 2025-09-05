import type * as payments from "@calcom/features/ee/teams/lib/payments";
import { beforeEach, expect, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

vi.mock("@calcom/features/ee/teams/lib/payments", () => paymentsMock);

beforeEach(() => {
  mockReset(paymentsMock);
});

const paymentsMock = mockDeep<typeof payments>();

export const paymentsScenarios = {};
export const paymentsExpects = {
  expectQuantitySubscriptionToBeUpdatedForTeam: (teamId: number) => {
    expect(paymentsMock.updateQuantitySubscriptionFromStripe).toHaveBeenCalledWith(teamId);
  },
};

export default paymentsMock;
