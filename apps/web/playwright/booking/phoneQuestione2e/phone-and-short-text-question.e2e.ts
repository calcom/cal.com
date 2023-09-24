import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Phone Question and Short text question", () => {
  test("Phone and Short text required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "text",
      true,
      true,
      "Test Phone question and Short Text question (both required)"
    );
  });

  test("Phone and Short text not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "text",
      true,
      false,
      "Test Phone question and Short Text question (both required)"
    );
  });
});
