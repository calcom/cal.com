import { test } from "../../lib/fixtures";
import { initialCommonSteps } from "../utils/bookingUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking With Address Question and Checkbox Question", () => {
  const bookingOptions = { hasPlaceholder: false, isRequired: true };
  test("Addres and checkbox required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "boolean",
      "Test Addres question and checkbox question (both required)",
      bookingOptions
    );
  });

  test("Addres and checkbox not required", async ({ page, users }) => {
    await initialCommonSteps(
      page,
      "address",
      users,
      "boolean",
      "Test Addres question and checkbox question (only address required)",
      { ...bookingOptions, isRequired: false }
    );
  });
});
