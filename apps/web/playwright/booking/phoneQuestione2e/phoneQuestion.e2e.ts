import { loginUser } from "../../fixtures/regularBookings";
import { test } from "../../lib/fixtures";
import { setupEventTypeAndExecuteBooking } from "../utils/bookingUtils";

test.describe("Booking With Phone Question and Each Other Question", () => {
  test.beforeEach(async ({ page, users }) => {
    await loginUser(users);
    await page.goto("/event-types");
  });

  test.describe("Booking With Phone Question and Address Question", () => {
    const bookingOptions = { hasPlaceholder: true, isRequired: true };
    test("Phone and Address required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "address",
        "Test Phone question and Address question (both required)",
        bookingOptions
      );
    });

    test("Phone and Address not required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "address",
        "Test Phone question and Address question (only Phone required)",
        { ...bookingOptions, isRequired: false }
      );
    });
  });

  test.describe("Booking With Phone Question and checkbox group Question", () => {
    const bookingOptions = { hasPlaceholder: false, isRequired: true };
    test("Phone and checkbox group required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "checkbox",
        "Test Phone question and checkbox group question (both required)",
        bookingOptions
      );
    });

    test("Phone and checkbox group not required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "checkbox",
        "Test Phone question and checkbox group question (only phone required)",
        { ...bookingOptions, isRequired: false }
      );
    });
  });

  test.describe("Booking With Phone Question and checkbox Question", () => {
    const bookingOptions = { hasPlaceholder: false, isRequired: true };
    test("Phone and checkbox required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "boolean",
        "Test Phone question and checkbox question (both required)",
        bookingOptions
      );
    });

    test("Phone and checkbox not required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "boolean",
        "Test Phone question and checkbox question (only phone required)",
        { ...bookingOptions, isRequired: false }
      );
    });
  });

  test.describe("Booking With Phone Question and Long text Question", () => {
    const bookingOptions = { hasPlaceholder: true, isRequired: true };
    test("Phone and Long text required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "textarea",
        "Test Phone question and Long text question (both required)",
        bookingOptions
      );
    });

    test("Phone and Long text not required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "textarea",
        "Test Phone question and Long text question (only Phone required)",
        { ...bookingOptions, isRequired: false }
      );
    });
  });

  test.describe("Booking With Phone Question and Multi email Question", () => {
    const bookingOptions = { hasPlaceholder: true, isRequired: true };
    test("Phone and Multi email required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "multiemail",
        "Test Phone question and Multi email question (both required)",
        bookingOptions
      );
    });

    test("Phone and Multi email not required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "multiemail",
        "Test Phone question and Multi email question (only phone required)",
        { ...bookingOptions, isRequired: false }
      );
    });
  });

  test.describe("Booking With Phone Question and multiselect Question", () => {
    const bookingOptions = { hasPlaceholder: false, isRequired: true };
    test("Phone and multiselect text required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "multiselect",
        "Test Phone question and multiselect question (both required)",
        bookingOptions
      );
    });

    test("Phone and multiselect text not required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "multiselect",
        "Test Phone question and multiselect question (only phone required)",
        { ...bookingOptions, isRequired: false }
      );
    });
  });

  test.describe("Booking With Phone Question and Number Question", () => {
    const bookingOptions = { hasPlaceholder: true, isRequired: true };
    test("Phone and Number required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "number",
        "Test Phone question and number question (both required)",
        bookingOptions
      );
    });

    test("Phone and Number not required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "number",
        "Test Phone question and number question (only phone required)",
        { ...bookingOptions, isRequired: false }
      );
    });
  });

  test.describe("Booking With Phone Question and Radio group Question", () => {
    const bookingOptions = { hasPlaceholder: false, isRequired: true };
    test("Phone and Radio group required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "radio",
        "Test Phone question and Radio group question (both required)",
        bookingOptions
      );
    });

    test("Phone and Radio group not required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "radio",
        "Test Phone question and Radio group question (only phone required)",
        { ...bookingOptions, isRequired: false }
      );
    });
  });

  test.describe("Booking With Phone Question and select Question", () => {
    const bookingOptions = { hasPlaceholder: false, isRequired: true };
    test("Phone and select required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "select",
        "Test Phone question and select question (both required)",
        bookingOptions
      );
    });

    test("Phone and select not required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "select",
        "Test Phone question and select question (only phone required)",
        { ...bookingOptions, isRequired: false }
      );
    });
  });

  test.describe("Booking With Phone Question and Short text question", () => {
    const bookingOptions = { hasPlaceholder: true, isRequired: true };
    test("Phone and Short text required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "text",
        "Test Phone question and Short Text question (both required)",
        bookingOptions
      );
    });

    test("Phone and Short text not required", async ({ page }) => {
      await setupEventTypeAndExecuteBooking(
        page,
        "phone",
        "text",
        "Test Phone question and Short Text question (only phone required)",
        { ...bookingOptions, isRequired: false }
      );
    });
  });
});
