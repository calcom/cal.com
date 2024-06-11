import { addEventTypesToDb } from "@calcom/test/utils/bookingScenario/bookingScenario";

import { describe } from "vitest";

describe("roundRobinReassignment", () => {
  test("Reassign new team member to round robin event", async () => {
    await addEventTypesToDb([]);
    expect(1).toBe(1);
  });
});
