import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Phone Question and Address Question", () => {
  test("Phone and Address required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "address",
      true,
      true,
      "Test Phone question and Address question (both required)"
    );
  });

  test("Phone and Address not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "address",
      true,
      false,
      "Test Phone question and Address question (only Phone required)"
    );
  });
});
