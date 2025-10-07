import type { Locator, Page, PlaywrightTestArgs } from "@playwright/test";
import { expect } from "@playwright/test";
import type { createUsersFixture } from "playwright/fixtures/users";
import { uuid } from "short-uuid";

import { fieldTypesConfigMap } from "@calcom/features/form-builder/fieldTypes";
import { md } from "@calcom/lib/markdownIt";
import prisma from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { test } from "./lib/fixtures";
import {
  createHttpServer,
  createNewUserEventType,
  selectFirstAvailableTimeSlotNextMonth,
  submitAndWaitForResponse,
} from "./lib/testUtils";

function getLabelLocator(field: Locator) {
  // There are 2 labels right now. Will be one in future. The second one is hidden
  return field.locator("label").first();
}

async function getLabelText(field: Locator) {
  return await getLabelLocator(field).locator("span").first().innerText();
}

test.describe.configure({ mode: "parallel" });
test.describe("Manage Booking Questions", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test.describe("For User EventType", () => {
    test("Do a booking with a Address type question and verify a few thing in b/w", async ({
      page,
      users,
      context,
    }, testInfo) => {
      test.setTimeout(testInfo.timeout * 3);
      const user = await createAndLoginUserWithEventTypes({ users, page });

      const webhookReceiver = await addWebhook(user);

      await test.step("Go to EventType Page ", async () => {
        const $eventTypes = page.locator("[data-testid=event-types] > li a");
        const firstEventTypeElement = $eventTypes.first();

        await firstEventTypeElement.click();
      });

      await runTestStepsCommonForTeamAndUserEventType(page, context, webhookReceiver);
    });

    test("Do a booking with Checkbox type question and verify a few thing in b/w", async ({
      page,
      users,
      context,
    }, testInfo) => {
      test.setTimeout(testInfo.timeout * 2);
      const user = await createAndLoginUserWithEventTypes({ users, page });

      

      await test.step("Go to EventType Advanced Page ", async () => {
        const $eventTypes = page.locator("[data-testid=event-types] > li a");
        const firstEventTypeElement = $eventTypes.first();

        await firstEventTypeElement.click();
        await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");
        await page.getByTestId("vertical-tab-event_advanced_tab_title").click();
      });

      await test.step("Add Question and see that it's shown on Booking Page at appropriate position", async () => {
        await addQuestionAndSave({
          page,
          question: {
            name: "agree-to-terms",
            type: "Checkbox",
            label: "Agree to [terms](https://example.com/terms)",
            required: true,
          },
        });

        await doOnFreshPreview(page, context, async (page) => {
          await expectSystemFieldsToBeThereOnBookingPage({ page });
          const userFieldLocator = page.locator('[data-fob-field-name="agree-to-terms"]');

          await expect(userFieldLocator.locator('[name="agree-to-terms"]')).toBeVisible();
          expect(await getLabelText(userFieldLocator)).toBe("Agree to terms");
          expect(await getLabelLocator(userFieldLocator).locator("a").getAttribute("href")).toBe(
            "https://example.com/terms"
          );
          await expect(userFieldLocator.locator("input")).toBeVisible();
        });
      });
    });

    test("Do a booking with a Date type question and verify a few thing in b/w", async ({
      page,
      users,
      context,
    }, testInfo) => {

      test.setTimeout(testInfo.timeout * 3);
      const user = await createAndLoginUserWithEventTypes({ users, page });

      const webhookReceiver = await addWebhook(user);

      await test.step("Go to EventType Advanced Page ", async () => {
        const $eventTypes = page.locator("[data-testid=event-types] > li a");
        const firstEventTypeElement = $eventTypes.first();

        await firstEventTypeElement.click();
        await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");
        await page.getByTestId("vertical-tab-event_advanced_tab_title").click();
      });

      await test.step("Add Date Question and verify all properties", async () => {
        await addQuestionAndSave({
          page,
          question: {
            name: "appointment-date",
            type: "Date",
            label: "Preferred Appointment Date",
            placeholder: "Select your preferred date",
            required: true,
          },
        });

        await doOnFreshPreview(page, context, async (page) => {
          await expectSystemFieldsToBeThereOnBookingPage({ page });
          const dateFieldLocator = page.locator('[data-fob-field-name="appointment-date"]');

          await expect(dateFieldLocator).toBeVisible();
          expect(await getLabelText(dateFieldLocator)).toBe("Preferred Appointment Date");

          const datePickerButton = dateFieldLocator.locator('[data-testid="pick-date"]');
          await expect(datePickerButton).toBeVisible();
          await expect(datePickerButton).toContainText("Pick a date");
          await expect(datePickerButton).toHaveAttribute("data-testid", "pick-date");

          await expect(datePickerButton.locator('svg[aria-hidden]')).toBeVisible();
        });
      });

      await test.step("Test Date picker interaction and validation", async () => {
        await doOnFreshPreview(page, context, async (page) => {
          const dateFieldLocator = page.locator('[data-fob-field-name="appointment-date"]');
          const datePickerButton = dateFieldLocator.locator('[data-testid="pick-date"]');
          
          await datePickerButton.click();
          await expect(page.locator('[role="dialog"]')).toBeVisible();
          
          await expect(page.locator('[role="grid"]')).toBeVisible();
          const gridCells = page.locator('[role="gridcell"]');
          const cellCount = await gridCells.count();
          expect([35, 42]).toContain(cellCount);
          
          await page.keyboard.press('Escape');
          await expect(page.locator('[role="dialog"]')).toBeHidden();
          
          await expect(datePickerButton).toContainText("Pick a date");
        });
      });

      await test.step("Test required field validation", async () => {
        await doOnFreshPreview(page, context, async (page) => {

          await bookTimeSlot({ page, name: "Booker", email: "booker@example.com", autoSelectDate: false });
          await expectErrorToBeThereFor({ page, name: "appointment-date" });
        });
      });

      await test.step("Test date selection and format", async () => {
        await doOnFreshPreview(page, context, async (page) => {
          const dateFieldLocator = page.locator('[data-fob-field-name="appointment-date"]');
          const datePickerButton = dateFieldLocator.locator('[data-testid="pick-date"]');

          await datePickerButton.click();
          const initialDateClicked = await pickAnyAvailableDateInCurrentGrid(page);
          expect(initialDateClicked).toBe(true);

          await expect(datePickerButton).not.toContainText("Pick a date");
          const buttonText = await datePickerButton.textContent();
          expect(buttonText).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
          await page.keyboard.press('Escape');
          await expect(page.locator('[role="dialog"]').first()).toBeHidden();
        });
      });

      await test.step("Complete booking and verify date format in webhook", async () => {
        await doOnFreshPreview(page, context, async (page) => {
          const dateFieldLocator = page.locator('[data-fob-field-name="appointment-date"]');
          const dateButton = dateFieldLocator.locator('[data-testid="pick-date"]');
          if ((await dateButton.textContent())?.includes('Pick a date')) {
            await dateButton.click();
            await pickAnyAvailableDateInCurrentGrid(page);
            await page.keyboard.press('Escape');
            await expect(page.locator('[role="dialog"]').first()).toBeHidden();
          }
          
          await bookTimeSlot({ page, name: "Booker", email: "booker@example.com" });
          await expect(page.locator("[data-testid=success-page]")).toBeVisible();

          const dateResponse = page.locator('[data-testid="field-response"][data-fob-field="appointment-date"]');
          await expect(dateResponse).toBeVisible();

          await webhookReceiver.waitForRequestCount(1);
          const [request] = webhookReceiver.requestList;
          // @ts-expect-error body is unknown
          const payload = request.body.payload;

          expect(payload.responses).toMatchObject({
            "appointment-date": {
              label: "Preferred Appointment Date",
              value: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            },
          });

          expect(payload.userFieldsResponses).toMatchObject({
            "appointment-date": {
              label: "Preferred Appointment Date",
              value: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            },
          });

          const dateValue = payload.responses["appointment-date"].value;
          const parsedDate = new Date(dateValue);
          expect(parsedDate.toISOString().split('T')[0]).toBe(dateValue);
        });
      });

      await test.step("Test date field prefill functionality", async () => {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 2);
        futureDate.setDate(15);
        
        const prefillDate = futureDate.toISOString().split('T')[0];
        const expectedDisplayDate = new Date(prefillDate).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        });
        
        const searchParams = new URLSearchParams();
        searchParams.append("appointment-date", prefillDate);
        
        await doOnFreshPreviewWithSearchParams(searchParams, page, context, async (page) => {
          await selectFirstAvailableTimeSlotNextMonth(page);
          
          const dateFieldLocator = page.locator('[data-fob-field-name="appointment-date"]');
          const datePickerButton = dateFieldLocator.locator('[data-testid="pick-date"]');
          
          await expect(datePickerButton).toContainText(expectedDisplayDate);
          await expect(datePickerButton).not.toContainText("Pick a date");
        });
      });

      await test.step("Test optional date field behavior", async () => {
        await toggleQuestionRequireStatusAndSave({
          required: false,
          name: "appointment-date",
          page,
        });

        await doOnFreshPreview(page, context, async (page) => {
          await bookTimeSlot({ page, name: "Booker Optional", email: "booker.optional@example.com" });
          await expect(page.locator("[data-testid=success-page]")).toBeVisible();
        });
      });
    });

    test("Split 'Full name' into 'First name' and 'Last name'", async ({
      page,
      users,
      context,
    }, testInfo) => {
      test.setTimeout(testInfo.timeout * 3);
      const user = await createAndLoginUserWithEventTypes({ page, users });
      const webhookReceiver = await addWebhook(user);
      await test.step("Go to first EventType Page ", async () => {
        const $eventTypes = page.locator("[data-testid=event-types] > li a");
        const firstEventTypeElement = $eventTypes.first();

        await firstEventTypeElement.click();
        await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");
      });

      await test.step("Open the 'Name' field dialog", async () => {
        await page.getByTestId("vertical-tab-event_advanced_tab_title").click();
        await page.locator('[data-testid="field-name"] [data-testid="edit-field-action"]').click();
      });

      await test.step("Toggle on the variant toggle and save Event Type", async () => {
        await page.click('[data-testid="variant-toggle"]');
        await page.click("[data-testid=field-add-save]");
        await saveEventType(page);
      });

      await test.step("Book a time slot with firstName and lastName provided separately", async () => {
        await doOnFreshPreview(page, context, async (page) => {
          await expectSystemFieldsToBeThereOnBookingPage({ page, isFirstAndLastNameVariant: true });
          await bookTimeSlot({
            page,
            name: { firstName: "John", lastName: "Doe" },
            email: "booker@example.com",
          });
          await expect(page.locator("[data-testid=success-page]")).toBeVisible();
          await expect(page.locator('[data-testid="attendee-name-John Doe"]').first()).toHaveText("John Doe");
          await expectWebhookToBeCalled(webhookReceiver, {
            triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
            payload: {
              attendees: [
                {
                  // It would have full Name only
                  name: "John Doe",
                  email: "booker@example.com",
                },
              ],
              responses: {
                name: {
                  label: "your_name",
                  value: {
                    firstName: "John",
                    lastName: "Doe",
                  },
                },
                email: {
                  label: "email_address",
                  value: "booker@example.com",
                },
              },
            },
          });
        });
      });

      await test.step("Verify that we can prefill name and other fields correctly", async () => {
        await doOnFreshPreview(page, context, async (page) => {
          const url = page.url();
          const prefillUrl = new URL(url);
          prefillUrl.searchParams.append("name", "John Johny Janardan");
          prefillUrl.searchParams.append("email", "john@example.com");
          prefillUrl.searchParams.append("guests", "guest1@example.com");
          prefillUrl.searchParams.append("guests", "guest2@example.com");
          await page.goto(prefillUrl.toString());
          await bookTimeSlot({ page, skipSubmission: true });
          await expectSystemFieldsToBeThereOnBookingPage({
            page,
            isFirstAndLastNameVariant: true,
            values: {
              name: {
                firstName: "John",
                lastName: "Johny Janardan",
              },
              email: "john@example.com",
              guests: ["guest1@example.com", "guest2@example.com"],
            },
          });
        });
      });

      await test.step("Verify that we can prefill name field with no lastname", async () => {
        const searchParams = new URLSearchParams();
        searchParams.append("name", "FirstName");
        await doOnFreshPreviewWithSearchParams(searchParams, page, context, async (page) => {
          await selectFirstAvailableTimeSlotNextMonth(page);
          await expectSystemFieldsToBeThereOnBookingPage({
            page,
            isFirstAndLastNameVariant: true,
            values: {
              name: {
                firstName: "FirstName",
                lastName: "",
              },
            },
          });
        });
      });

      await test.step("Verify that we can prefill name field with firstName,lastName query params", async () => {
        const searchParams = new URLSearchParams();
        searchParams.append("firstName", "John");
        searchParams.append("lastName", "Doe");
        await doOnFreshPreviewWithSearchParams(searchParams, page, context, async (page) => {
          await selectFirstAvailableTimeSlotNextMonth(page);
          await expectSystemFieldsToBeThereOnBookingPage({
            page,
            isFirstAndLastNameVariant: true,
            values: {
              name: {
                firstName: "John",
                lastName: "Doe",
              },
            },
          });
        });
      });
    });
  });

  test.describe("For Team EventType", () => {
    // eslint-disable-next-line playwright/no-skipped-test
    test("Do a booking with a user added question and verify a few thing in b/w", async ({
      page,
      users,
      context,
    }, testInfo) => {
      // Considering there are many steps in it, it would need more than default test timeout
      test.setTimeout(testInfo.timeout * 3);
      const user = await createAndLoginUserWithEventTypes({ users, page });
      const team = await prisma.team.findFirst({
        where: {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      const teamId = team?.id;
      const webhookReceiver = await addWebhook(undefined, teamId);

      await test.step("Go to First Team Event", async () => {
        const locator = page.getByTestId(`horizontal-tab-${team?.name}`);
        await locator.click();
        await expect(locator).toHaveAttribute("aria-current", "page");
        const $eventTypes = page.locator("[data-testid=event-types]").locator("li a");
        const firstEventTypeElement = $eventTypes.first();

        await firstEventTypeElement.click();
      });

      await runTestStepsCommonForTeamAndUserEventType(page, context, webhookReceiver);
    });
  });
});

async function runTestStepsCommonForTeamAndUserEventType(
  page: Page,
  context: PlaywrightTestArgs["context"],
  webhookReceiver: Awaited<ReturnType<typeof addWebhook>>
) {
  await page.click('[href$="tabName=advanced"]');

  await test.step("Check that all the system questions are shown in the list", async () => {
    await page.locator("[data-testid=field-name]").isVisible();
    await page.locator("[data-testid=field-email]").isVisible();
    await page.locator("[data-testid=field-notes]").isVisible();
    await page.locator("[data-testid=field-guests]").isVisible();
    await page.locator("[data-testid=field-rescheduleReason]").isVisible();
    
  });

  await test.step("Add Question and see that it's shown on Booking Page at appropriate position", async () => {
    await addQuestionAndSave({
      page,
      question: {
        name: "how-are-you",
        type: "Address",
        label: "How are you?",
        placeholder: "I'm fine, thanks",
        required: true,
      },
    });

    await doOnFreshPreview(page, context, async (page) => {
      await expectSystemFieldsToBeThereOnBookingPage({ page });
      const userFieldLocator = page.locator('[data-fob-field-name="how-are-you"]');

      await expect(userFieldLocator.locator('[name="how-are-you"]')).toBeVisible();
      expect(await getLabelText(userFieldLocator)).toBe("How are you?");
      await expect(userFieldLocator.locator("input")).toBeVisible();
    });
  });

  await test.step("Hide Question and see that it's not shown on Booking Page", async () => {
    await toggleQuestionAndSave({
      name: "how-are-you",
      page,
    });
    await doOnFreshPreview(page, context, async (page) => {
      const formBuilderFieldLocator = page.locator('[data-fob-field-name="how-are-you"]');
      await expect(formBuilderFieldLocator).toBeHidden();
    });
  });

  await test.step("Show Question Again", async () => {
    await toggleQuestionAndSave({
      name: "how-are-you",
      page,
    });
  });

  await test.step('Try to book without providing "How are you?" response', async () => {
    await doOnFreshPreview(page, context, async (page) => {
      await bookTimeSlot({ page, name: "Booker", email: "booker@example.com" });
      await expectErrorToBeThereFor({ page, name: "how-are-you" });
    });
  });

  await test.step("Make rescheduleReason required - It won't be required for a fresh booking", async () => {
    await toggleQuestionRequireStatusAndSave({
      required: true,
      name: "rescheduleReason",
      page,
    });
  });

  const previewTabPage =
    await test.step("Do a booking and notice that we can book without giving a value for rescheduleReason", async () => {
      return await doOnFreshPreview(
        page,
        context,
        async (page) => {
          const formBuilderFieldLocator = page.locator('[data-fob-field-name="how-are-you"]');
          await expect(formBuilderFieldLocator).toBeVisible();
          expect(
            await formBuilderFieldLocator.locator('[name="how-are-you"]').getAttribute("placeholder")
          ).toBe("I'm fine, thanks");
          expect(await getLabelText(formBuilderFieldLocator)).toBe("How are you?");
          await formBuilderFieldLocator.locator('[name="how-are-you"]').fill("I am great!");
          await bookTimeSlot({ page, name: "Booker", email: "booker@example.com" });
          await expect(page.locator("[data-testid=success-page]")).toBeVisible();

          expect(
            await page.locator('[data-testid="field-response"][data-fob-field="how-are-you"]').innerText()
          ).toBe("I am great!");

          await webhookReceiver.waitForRequestCount(1);

          const [request] = webhookReceiver.requestList;

          // @ts-expect-error body is unknown
          const payload = request.body.payload;

          expect(payload.responses).toMatchObject({
            email: {
              label: "email_address",
              value: "booker@example.com",
            },
            "how-are-you": {
              label: "How are you?",
              value: "I am great!",
            },
            name: {
              label: "your_name",
              value: "Booker",
            },
          });

          expect(payload.attendees[0]).toMatchObject({
            name: "Booker",
            email: "booker@example.com",
          });

          expect(payload.userFieldsResponses).toMatchObject({
            "how-are-you": {
              label: "How are you?",
              value: "I am great!",
            },
          });
        },
        true
      );
    });

  await test.step("Do a reschedule and notice that we can't book without giving a value for rescheduleReason", async () => {
    const page = previewTabPage;
    await rescheduleFromTheLinkOnPage({ page });
    await expectErrorToBeThereFor({ page, name: "rescheduleReason" });
  });
}

async function pickAnyAvailableDateInCurrentGrid(page: Page): Promise<boolean> {
  await expect(page.locator('[role="dialog"]').first()).toBeVisible();
  await expect(page.locator('[role="grid"]').first()).toBeVisible();
  const grid = page.locator('[role="grid"]').first();
  const cells = await grid.locator('[role="gridcell"]').all();
  for (const cell of cells) {
    try {
      const isDisabled = await cell.getAttribute('aria-disabled');
      const outside = await cell.getAttribute('data-outside');
      const hidden = await cell.getAttribute('data-hidden');
      const unavailable = await cell.getAttribute('data-unavailable');
      if (isDisabled === 'true' || outside === 'true' || hidden === 'true' || unavailable === 'true') continue;
      const txt = (await cell.textContent())?.trim() || "";
      const num = txt ? parseInt(txt) : NaN;
      if (!isNaN(num) && num > 0) {
        await cell.click({ timeout: 5000 });
        return true;
      }
    } catch {
      // keep trying others
    }
  }
  return false;
}

async function expectSystemFieldsToBeThereOnBookingPage({
  page,
  isFirstAndLastNameVariant,
  values,
}: {
  page: Page;
  isFirstAndLastNameVariant?: boolean;
  values?: Partial<{
    name: {
      firstName?: string;
      lastName?: string;
      fullName?: string;
    };
    email: string;
    notes: string;
    guests: string[];
  }>;
}) {
  const nameLocator = page.locator('[data-fob-field-name="name"]');
  const emailLocator = page.locator('[data-fob-field-name="email"]');
  
  const additionalNotes = page.locator('[data-fob-field-name="notes"]');
  const guestsLocator = page.locator('[data-fob-field-name="guests"]');

  if (isFirstAndLastNameVariant) {
    if (values?.name) {
      await expect(nameLocator.locator('[name="firstName"]')).toHaveValue(values?.name?.firstName || "");
      await expect(nameLocator.locator('[name="lastName"]')).toHaveValue(values?.name?.lastName || "");
      expect(await nameLocator.locator(".testid-firstName > label").innerText()).toContain("*");
    } else {
      await expect(nameLocator.locator('[name="firstName"]')).toBeVisible();
      await expect(nameLocator.locator('[name="lastName"]')).toBeVisible();
    }
  } else {
    if (values?.name) {
      await expect(nameLocator.locator('[name="name"]')).toHaveValue(values?.name?.fullName || "");
    }
    await expect(nameLocator.locator('[name="name"]')).toBeVisible();
    expect(await nameLocator.locator("label").innerText()).toContain("*");
  }

  if (values?.email) {
    await expect(emailLocator.locator('[name="email"]')).toHaveValue(values?.email || "");
  } else {
    await expect(emailLocator.locator('[name="email"]')).toBeVisible();
  }

  if (values?.notes) {
    await expect(additionalNotes.locator('[name="notes"]')).toHaveValue(values?.notes);
  } else {
    await expect(additionalNotes.locator('[name="notes"]')).toBeVisible();
  }

  if (values?.guests) {
    const allGuestsLocators = guestsLocator.locator('[type="email"]');
    for (let i = 0; i < values.guests.length; i++) {
      await expect(allGuestsLocators.nth(i)).toHaveValue(values.guests[i] || "");
    }
    await expect(guestsLocator.locator("[data-testid='add-another-guest']")).toBeVisible();
  } else {
    await expect(guestsLocator.locator("[data-testid='add-guests']")).toBeVisible();
  }
}

//TODO: Add one question for each type and see they are rendering labels and only once and are showing appropriate native component
// Verify webhook is sent with the correct data, DB is correct (including metadata)

//TODO: Verify that prefill works
async function bookTimeSlot({
  page,
  name,
  email,
  skipSubmission = false,
  autoSelectDate = true,
}: {
  page: Page;
  name?: string | { firstName: string; lastName?: string };
  email?: string;
  skipSubmission?: boolean;
  autoSelectDate?: boolean;
}) {
  if (name) {
    if (typeof name === "string") {
      await page.fill('[name="name"]', name);
    } else {
      await page.fill('[name="firstName"]', name.firstName);
      if (name.lastName) {
        await page.fill('[name="lastName"]', name.lastName);
      }
    }
  }
  if (email) {
    await page.fill('[name="email"]', email);
  }

  if (autoSelectDate) {
    // Auto-select a date for any Date question(s) present if not already selected
    const datePickers = page.locator('[data-testid="pick-date"]');
    const datePickersCount = await datePickers.count();
    for (let i = 0; i < datePickersCount; i++) {
      const btn = datePickers.nth(i);
      const text = (await btn.textContent()) || "";
      const hasPickText = text.toLowerCase().includes("pick a date");
      if (hasPickText) {
        await btn.click();
        // Ensure calendar is visible
        await expect(page.locator('[role="dialog"]').first()).toBeVisible();
        await expect(page.locator('[role="grid"]').first()).toBeVisible();
        const grid = page.locator('[role="grid"]').first();
        const gridCells = await grid.locator('[role="gridcell"]').all();
        // Prefer a mid-month day to avoid edge days from prev/next months
        let selected = false;
        const preferredDays = [15, 16, 14, 13, 17, 12, 18, 11, 19, 10];
        const tryClickDay = async (preferred?: number) => {
          for (const cell of gridCells) {
            try {
              const isDisabled = await cell.getAttribute('aria-disabled');
              if (isDisabled === 'true') continue;
              const hidden = await cell.getAttribute('data-hidden');
              if (hidden === 'true') continue;
              const outside = await cell.getAttribute('data-outside');
              if (outside === 'true') continue;
              const unavailable = await cell.getAttribute('data-unavailable');
              if (unavailable === 'true') continue;
              const txt = (await cell.textContent())?.trim() || "";
              const dayNum = txt ? parseInt(txt) : NaN;
              if (!isNaN(dayNum) && dayNum > 0 && (!preferred || dayNum === preferred)) {
                await cell.click({ timeout: 5000 });
                selected = true;
                break;
              }
            } catch {
              // continue
            }
          }
        };
        for (const d of preferredDays) {
          if (selected) break;
          await tryClickDay(d);
        }
        if (!selected) {
          await tryClickDay();
        }
        // Verify selection applied (button text should no longer contain the placeholder)
        await expect(btn).not.toContainText("Pick a date", { timeout: 5000 });
      }
    }
  }
  if (!skipSubmission) {
    await page.press('[name="email"]', "Enter");
  }
}

/**
 * 'option' starts from 1
 */
async function selectOption({
  page,
  selector,
  optionText,
}: {
  page: Page;
  selector: { selector: string; nth: number };
  optionText: string;
}) {
  const locatorForSelect = page.locator(selector.selector).nth(selector.nth);
  await locatorForSelect.click();
  await locatorForSelect.locator(`text="${optionText}"`).click();
}

async function addQuestionAndSave({
  page,
  question,
}: {
  page: Page;
  question: {
    name?: string;
    type?: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
  };
}) {
  await page.click('[data-testid="add-field"]');

  if (question.type !== undefined) {
    await selectOption({
      page,
      selector: {
        selector: "[id=test-field-type]",
        nth: 0,
      },
      optionText: question.type,
    });
  }

  if (question.name !== undefined) {
    await page.fill('[name="name"]', question.name);
  }

  if (question.label !== undefined) {
    if (question.type === "Checkbox") {
      const editorInput = page.locator('[data-testid="editor-input"]');
      await editorInput.fill(md.render(question.label));
    } else {
      await page.fill('[name="label"]', question.label);
    }
  }

  if (question.placeholder !== undefined) {
    // Wait for placeholder field to be available (some field types may not have it)
    const placeholderField = page.locator('[name="placeholder"]');
    try {
      await placeholderField.waitFor({ state: 'visible', timeout: 5000 });
      await placeholderField.fill(question.placeholder);
    } catch (error) {
      console.warn(`Placeholder field not available for ${question.type} field type, skipping...`);
    }
  }

  if (question.required !== undefined) {
    const requiredCheckbox = page.locator('[data-testid="field-required"]').first();
    await requiredCheckbox.waitFor({ state: 'visible' });
    
    const getState = async () => {
      const aria = (await requiredCheckbox.getAttribute('aria-checked')) ?? '';
      const dataState = (await requiredCheckbox.getAttribute('data-state')) ?? '';
      const checked = (await requiredCheckbox.getAttribute('checked')) ?? '';
      const isChecked = await requiredCheckbox.isChecked();
      
      return aria === 'true' || 
             dataState === 'checked' || 
             checked !== null || 
             isChecked;
    };
    
    const currentState = await getState();
    if (currentState !== question.required) {
      await requiredCheckbox.click();
      await page.waitForTimeout(100);
    }
  }

  await page.click('[data-testid="field-add-save"]');
  await saveEventType(page);
}

async function expectErrorToBeThereFor({ page, name }: { page: Page; name: string }) {

  await page.waitForTimeout(1000);
  
  const fieldLocator = page.locator(`[data-fob-field-name="${name}"]`);
  const fieldExists = await fieldLocator.count() > 0;
  
  if (!fieldExists) {
    console.log(`Field '${name}' does not exist on this form, skipping validation test`);
    return;
  }
  
  if (name === "rescheduleReason") {
    const submitButton = page.locator('[data-testid="confirm-reschedule-button"]');
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForTimeout(2000);
    }
  }
  
  const errorLocator = page.locator(`[data-testid=error-message-${name}]`);
  
  try {
    await expect(errorLocator).toHaveCount(1, { timeout: 10000 });
  } catch (error) {
    const allErrors = await page.locator('[data-testid^="error-message-"]').all();
    const errorIds = await Promise.all(allErrors.map(async (el) => {
      const testId = await el.getAttribute('data-testid');
      return testId;
    }));
    console.log(`Expected error for '${name}' but found errors:`, errorIds);
    
    const allFields = await page.locator('[data-fob-field-name]').all();
    const fieldNames = await Promise.all(allFields.map(async (el) => {
      return await el.getAttribute('data-fob-field-name');
    }));
    console.log(`All fields present:`, fieldNames);
    
    const anyErrors = await page.locator('[data-testid^="error-message-"]').count();
    console.log(`Total error messages found:`, anyErrors);
    
    if (anyErrors === 0) {
      console.log(`No validation errors found. This might be expected if ${name} is not required or validation is not triggered.`);

      return;
    }
    
    throw error;
  }
  
  // TODO: We should either verify the error message or error code in the test so we know that the correct error is shown
  // Checking for the error message isn't well maintainable as translation can change and we might want to verify in non english language as well.
}

/**
 * Opens a fresh preview window and runs the callback on it giving it the preview tab's `page`
 */
async function doOnFreshPreview(
  page: Page,
  context: PlaywrightTestArgs["context"],
  callback: (page: Page) => Promise<void>,
  persistTab = false
) {
  const previewTabPage = await openBookingFormInPreviewTab(context, page);
  await callback(previewTabPage);
  if (!persistTab) {
    await previewTabPage.close();
  }
  return previewTabPage;
}

async function doOnFreshPreviewWithSearchParams(
  searchParams: URLSearchParams,
  page: Page,
  context: PlaywrightTestArgs["context"],
  callback: (page: Page) => Promise<void>,
  persistTab = false
) {
  const previewUrl = (await page.locator('[data-testid="preview-button"]').getAttribute("href")) || "";
  const previewUrlObj = new URL(previewUrl);
  searchParams.forEach((value, key) => {
    previewUrlObj.searchParams.append(key, value);
  });
  const previewTabPage = await context.newPage();
  await previewTabPage.goto(previewUrlObj.toString());
  await callback(previewTabPage);
  if (!persistTab) {
    await previewTabPage.close();
  }
  return previewTabPage;
}

async function toggleQuestionAndSave({ name, page }: { name: string; page: Page }) {
  await page.locator(`[data-testid="field-${name}"]`).locator('[data-testid="toggle-field"]').click();
  await saveEventType(page);
}

async function toggleQuestionRequireStatusAndSave({
  required,
  name,
  page,
}: {
  required: boolean;
  name: string;
  page: Page;
}) {
  const openDialog = async () => {
    await page
      .locator(`[data-testid="field-${name}"]`)
      .locator('[data-testid="edit-field-action"]').click();
    await page.locator('[data-testid="edit-field-dialog"]').waitFor({ state: 'visible' });
  };
  const closeAndSave = async () => {
    await page.locator('[data-testid="field-add-save"]').click();
    await saveEventType(page);
  };

  await openDialog();
  const dialog = page.locator('[data-testid="edit-field-dialog"]');

  // Try multiple selectors to find the required toggle reliably across components
  let toggle = dialog.locator('[data-testid="field-required"]').first();
  if ((await toggle.count()) === 0) {
    // Try an accessible checkbox labeled Required
    const labeled = dialog.getByRole('checkbox', { name: /required/i });
    if ((await labeled.count()) > 0) toggle = labeled.first();
  }
  if ((await toggle.count()) === 0) {
    // Try a switch role near label text
    const row = dialog.getByText(/required/i).locator('..');
    const switchLike = row.locator('[role="switch"], input[type="checkbox"], button').first();
    if ((await switchLike.count()) > 0) toggle = switchLike;
  }

  await toggle.waitFor({ state: 'visible' });

  const isOn = async () => {
    const aria = (await toggle.getAttribute('aria-checked')) ?? '';
    const dataState = (await toggle.getAttribute('data-state')) ?? '';
    // For native checkbox
    let checked = false;
    try {
      checked = await toggle.isChecked();
    } catch {
      checked = false;
    }
    return aria === 'true' || dataState === 'checked' || checked;
  };

  let before = await isOn();
  if (before !== required) {
    await toggle.click();
    await page.waitForTimeout(150);
  }

  await closeAndSave();

  // Re-open and verify persisted state; retry once if mismatched.
  await openDialog();
  const toggle2 = await (async () => {
    let t = dialog.locator('[data-testid="field-required"]').first();
    if ((await t.count()) === 0) {
      const labeled = dialog.getByRole('checkbox', { name: /required/i });
      if ((await labeled.count()) > 0) t = labeled.first();
    }
    if ((await t.count()) === 0) {
      const row = dialog.getByText(/required/i).locator('..');
      const alt = row.locator('[role="switch"], input[type="checkbox"], button').first();
      if ((await alt.count()) > 0) t = alt;
    }
    return t;
  })();
  const current = await (async () => {
    const aria = (await toggle2.getAttribute('aria-checked')) ?? '';
    const dataState = (await toggle2.getAttribute('data-state')) ?? '';
    let checked = false;
    try {
      checked = await toggle2.isChecked();
    } catch {
      checked = false;
    }
    return aria === 'true' || dataState === 'checked' || checked;
  })();

  if (current !== required) {
    await toggle2.click();
    await page.waitForTimeout(150);
    await closeAndSave();
  } else {
    await closeAndSave();
  }
}

async function createAndLoginUserWithEventTypes({
  users,
  page,
}: {
  users: ReturnType<typeof createUsersFixture>;
  page: Page;
}) {
  const user = await users.create(null, {
    hasTeam: true,
  });
  await user.apiLogin();
  await page.goto("/event-types");
  // We wait until loading is finished
  await page.waitForSelector('[data-testid="event-types"]');
  return user;
}

async function rescheduleFromTheLinkOnPage({ page }: { page: Page }) {
  await page.locator('[data-testid="reschedule-link"]').click();
  await page.waitForLoadState();
  await selectFirstAvailableTimeSlotNextMonth(page);
  
}

async function openBookingFormInPreviewTab(context: PlaywrightTestArgs["context"], page: Page) {
  const previewTabPromise = context.waitForEvent("page");
  await page.locator('[data-testid="preview-button"]').click();
  const previewTabPage = await previewTabPromise;
  await previewTabPage.waitForLoadState();
  await previewTabPage.waitForURL((url) => {
    return url.searchParams.get("overlayCalendar") === "true";
  });
  await selectFirstAvailableTimeSlotNextMonth(previewTabPage);
  return previewTabPage;
}

async function saveEventType(page: Page) {
  await submitAndWaitForResponse(page, "/api/trpc/eventTypesHeavy/update?batch=1", {
    action: () => page.locator("[data-testid=update-eventtype]").click(),
  });
}

async function addWebhook(
  user?: Awaited<ReturnType<typeof createAndLoginUserWithEventTypes>>,
  teamId?: number | null
) {
  const webhookReceiver = createHttpServer();

  const data: {
    id: string;
    subscriberUrl: string;
    eventTriggers: WebhookTriggerEvents[];
    userId?: number;
    teamId?: number;
  } = {
    id: uuid(),
    subscriberUrl: webhookReceiver.url,
    eventTriggers: [
      WebhookTriggerEvents.BOOKING_CREATED,
      WebhookTriggerEvents.BOOKING_CANCELLED,
      WebhookTriggerEvents.BOOKING_RESCHEDULED,
    ],
  };

  if (teamId) {
    data.teamId = teamId;
  } else if (user) {
    data.userId = user.id;
  }

  await prisma.webhook.create({ data });

  return webhookReceiver;
}

async function expectWebhookToBeCalled(
  webhookReceiver: Awaited<ReturnType<typeof addWebhook>>,
  expectedBody: {
    triggerEvent: WebhookTriggerEvents;
    payload: Omit<Partial<CalendarEvent>, "attendees"> & {
      attendees: Partial<CalendarEvent["attendees"][number]>[];
    };
  }
) {
  await webhookReceiver.waitForRequestCount(1);
  const [request] = webhookReceiver.requestList;

  const body = request.body;

  expect(body).toMatchObject(expectedBody);
}

test.describe("Text area min and max characters text", () => {
  test("Create a new event", async ({ page, users }) => {
    const eventTitle = `Min Max Characters Test`;
    const fieldType = fieldTypesConfigMap["textarea"];
    const MAX_LENGTH = fieldType?.supportsLengthCheck?.maxLength;

    // We create a new event type
    const user = await users.create();
    await user.apiLogin();

    await page.goto("/event-types");

    // We wait until loading is finished
    await page.waitForSelector('[data-testid="event-types"]');
    await createNewUserEventType(page, { eventTitle });
    await page.waitForSelector('[data-testid="event-title"]');
    await expect(page.getByTestId("vertical-tab-basics")).toContainText("Basics"); //fix the race condition
    await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");
    await page.getByTestId("vertical-tab-event_advanced_tab_title").click();
    const insertQuestion = async (questionName: string) => {
      const element = page.locator('[data-testid="add-field"]');
      await element.click();
      const locatorForSelect = page.locator("[id=test-field-type]").nth(0);
      await locatorForSelect.click();
      await locatorForSelect.locator(`text="Long Text"`).click();

      await page.fill('[name="name"]', questionName);
      await page.fill('[name="label"]', questionName);
      await page.fill('[name="placeholder"]', questionName);
    };

    const saveQuestion = async () => {
      await page.click('[data-testid="field-add-save"]');
    };
    const cancelQuestion = async () => {
      await page.click('[data-testid="dialog-rejection"]');
    };
    const minLengthSelector = '[name="minLength"]';
    const maxLengthSelector = '[name="maxLength"]';
    const minInput = await page.locator(minLengthSelector);
    const maxInput = await page.locator(maxLengthSelector);
    let questionName;
    await test.step("Add a new field with no min and max characters", async () => {
      // Add a new field with no min and max characters
      questionName = "Text area without min & max";
      await insertQuestion(questionName);
      await saveQuestion();
    });

    await test.step("Add a new field with min characters only", async () => {
      // Add a new field with min characters only
      questionName = "Text area with min = 5";
      await insertQuestion(questionName);
      await page.fill(minLengthSelector, "5");
      await saveQuestion();
    });
    await test.step("Add a new field with max characters only", async () => {
      // Add a new field with max characters only
      questionName = "Text area with max = 10";
      await insertQuestion(questionName);
      await page.fill(maxLengthSelector, "10");
      await saveQuestion();
    });

    await test.step("Add a new field with min and max characters where min < max", async () => {
      // Add a new field with min and max characters where min < max
      questionName = "Text area with min = 5 & max = 10";
      await insertQuestion(questionName);
      await page.fill(minLengthSelector, "5");
      await page.fill(maxLengthSelector, "10");
      await saveQuestion();
    });

    await test.step("Add a new field with min and max characters where min > max", async () => {
      // Add a new field with min and max characters where min > max
      questionName = "Text area with min = 10 & max = 5";
      await insertQuestion(questionName);
      await page.fill(minLengthSelector, "10");
      await page.fill(maxLengthSelector, "5");
      await saveQuestion();
    });

    await test.step("Try with different inputs and check for validation", async () => {
      // Expect the native <input> element to show an error message

      let validationMessage = await minInput?.evaluate((input: any) => input?.validationMessage as string);
      // FIXME: This error message will be localized depending on the browser locale.
      expect(validationMessage?.toString()).toBe("Value must be less than or equal to 5.");

      await page.fill(minLengthSelector, "0");
      await page.fill(maxLengthSelector, "100000");
      await saveQuestion();
      // Expect the native <input> element to show an error message

      validationMessage = await maxInput?.evaluate((input: any) => input?.validationMessage as string);

      expect(validationMessage?.toString()).toBe(
        `Value must be less than or equal to ${MAX_LENGTH || 1000}.`
      );
      await cancelQuestion();
      // Save the event type
      await saveEventType(page);

      // Get the url of data-testid="preview-button"
      const previewButton = await page.locator('[data-testid="preview-button"]');
      const previewButtonHref = (await previewButton.getAttribute("href")) ?? "";
      await page.goto(previewButtonHref);

      // wait until the button with data-testid="time" is visible
      await page.locator('[data-testid="time"]').isVisible();

      await page.getByTestId("incrementMonth").click();

      // Get first button with data-testid="time"
      const timeButton = page.locator('[data-testid="time"]').first();
      await timeButton.click();

      await page.locator('text="Additional notes"');
      // Form fields:
      const textAreaWithoutMinMax = page.locator('[name="Text-area-without-min---max"]');
      const textAreaWithMin5 = page.locator('[name="Text-area-with-min---5"]');
      const textAreaWithMax10 = page.locator('[name="Text-area-with-max---10"]');
      const textAreaWithMin5Max10 = page.locator('[name="Text-area-with-min---5---max---10"]');

      // Get button with data-testid="confirm-book-button"
      const submitForm = async () => await page.locator('[data-testid="confirm-book-button"]').click();
      await page.fill('[name="name"]', "Booker");
      await page.fill('[name="email"]', "booker@example.com");
      await textAreaWithoutMinMax.fill("1234567890");
      await textAreaWithMin5.fill("1234");
      await textAreaWithMax10.fill("12345678901");
      await textAreaWithMin5Max10.fill("1234");
      await submitForm();
      // Expect the text: Min. 5 characters to be visible
      await expect(page.locator(`text=Min. 5 characters required`)).toBeVisible();

      // update the text area with min 5 to have 5 characters
      await textAreaWithMin5.fill("12345");
      await submitForm();

      // Expect the text: Min. 5 characters to still be visible because textAreaWithMin5Max10 has less than 5 characters
      await expect(page.locator(`text=Min. 5 characters required`)).toBeVisible();

      // Expect the text: Max. 10 characters to be visible and have value 1234567890
      expect(await textAreaWithMax10.inputValue()).toBe("1234567890");
      await submitForm();

      // update the text area with min 5 and max 10 to have 6 characters
      await textAreaWithMin5Max10.fill("123456");
      await submitForm();

      // Expect the text: Max. 5 characters to be hidden
      await expect(page.locator(`text=Min. 5 characters required`)).toBeHidden();

      await expect(page.locator('text="This meeting is scheduled"')).toBeVisible();
    });
  });
});
