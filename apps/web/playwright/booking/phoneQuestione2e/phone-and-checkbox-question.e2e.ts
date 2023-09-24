import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Phone Question and checkbox Question", () => {
  test("Phone and checkbox required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "boolean",
      false,
      true,
      "Test Phone question and checkbox question (both required)",
      false,
      true
    );
  });

  test("Phone and checkbox not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "phone",
      users,
      "boolean",
      false,
      false,
      "Test Phone question and checkbox question (only phone required)",
      false,
      true
    );
  });
});
