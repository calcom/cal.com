import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Phone Question and Long text Question", () => {
  test("Phone and Long text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "textarea",
      true,
      true,
      "Test Phone question and Address question (both required)"
    );
  });

  test("Phone and Long text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "textarea",
      true,
      false,
      "Test Phone question and Address question (only Phone required)"
    );
  });
});
