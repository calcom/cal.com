import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Phone Question and Radio group Question", () => {
  test("Phone and Radio group required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "radio",
      false,
      true,
      "Test Phone question and Radio group question (both required)",
      true
    );
  });

  test("Phone and Radio group not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "radio",
      false,
      false,
      "Test Phone question and Radio group question (both required)",
      true
    );
  });
});
