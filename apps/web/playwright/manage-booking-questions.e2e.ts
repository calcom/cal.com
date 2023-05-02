import type { Locator, Page, PlaywrightTestArgs } from "@playwright/test";
import { expect } from "@playwright/test";
import type { createUsersFixture } from "playwright/fixtures/users";
import { uuid } from "short-uuid";

import prisma from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";
import { testBothBookers } from "./lib/new-booker";
import type { BookerVariants } from "./lib/new-booker";
import { createHttpServer, waitFor, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

async function getLabelText(field: Locator) {
  return await field.locator("label").first().locator("span").first().innerText();
}

test.describe("Manage Booking Questions", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  testBothBookers.describe("For User EventType", (bookerVariant) => {
    test("Do a booking with a user added question and verify a few thing in b/w", async ({
      page,
      users,
      context,
    }, testInfo) => {
      // Considering there are many steps in it, it would need more than default test timeout
      test.setTimeout(testInfo.timeout * 3);
      const user = await createAndLoginUserWithEventTypes({ users });

      const webhookReceiver = await addWebhook(user);

      await test.step("Go to EventType Page ", async () => {
        const $eventTypes = page.locator("[data-testid=event-types] > li a");
        const firstEventTypeElement = $eventTypes.first();

        await firstEventTypeElement.click();
      });

      await runTestStepsCommonForTeamAndUserEventType(page, context, webhookReceiver, bookerVariant);
    });
  });

  testBothBookers.describe("For Team EventType", (bookerVariant) => {
    test("Do a booking with a user added question and verify a few thing in b/w", async ({
      page,
      users,
      context,
    }, testInfo) => {
      // Considering there are many steps in it, it would need more than default test timeout
      test.setTimeout(testInfo.timeout * 3);
      const user = await createAndLoginUserWithEventTypes({ users });

      const webhookReceiver = await addWebhook(user);

      await test.step("Go to First Team Event", async () => {
        const $eventTypes = page.locator("[data-testid=event-types]").nth(1).locator("li a");
        const firstEventTypeElement = $eventTypes.first();

        await firstEventTypeElement.click();
      });

      await runTestStepsCommonForTeamAndUserEventType(page, context, webhookReceiver, bookerVariant);
    });
  });
});

async function runTestStepsCommonForTeamAndUserEventType(
  page: Page,
  context: PlaywrightTestArgs["context"],
  webhookReceiver: {
    port: number;
    close: () => import("http").Server;
    requestList: (import("http").IncomingMessage & { body?: unknown })[];
    url: string;
  },
  bookerVariant: BookerVariants
) {
  await page.click('[href$="tabName=advanced"]');

  await test.step("Add Question and see that it's shown on Booking Page at appropriate position", async () => {
    await addQuestionAndSave({
      page,
      question: {
        name: "how_are_you",
        type: "Name",
        label: "How are you?",
        placeholder: "I'm fine, thanks",
        required: true,
      },
    });

    await doOnFreshPreview(page, context, bookerVariant, async (page) => {
      const allFieldsLocator = await expectSystemFieldsToBeThere(page);
      const userFieldLocator = allFieldsLocator.nth(5);

      await expect(userFieldLocator.locator('[name="how_are_you"]')).toBeVisible();
      // There are 2 labels right now. Will be one in future. The second one is hidden
      expect(await getLabelText(userFieldLocator)).toBe("How are you?");
      await expect(userFieldLocator.locator("input[type=text]")).toBeVisible();
    });
  });

  await test.step("Hide Question and see that it's not shown on Booking Page", async () => {
    await toggleQuestionAndSave({
      name: "how_are_you",
      page,
    });
    await doOnFreshPreview(page, context, bookerVariant, async (page) => {
      const formBuilderFieldLocator = page.locator('[data-fob-field-name="how_are_you"]');
      await expect(formBuilderFieldLocator).toBeHidden();
    });
  });

  await test.step("Show Question Again", async () => {
    await toggleQuestionAndSave({
      name: "how_are_you",
      page,
    });
  });

  await test.step('Try to book without providing "How are you?" response', async () => {
    await doOnFreshPreview(page, context, bookerVariant, async (page) => {
      await bookTimeSlot({ page, name: "Booker", email: "booker@example.com" });
      await expectErrorToBeThereFor({ page, name: "how_are_you" });
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
        bookerVariant,
        async (page) => {
          const formBuilderFieldLocator = page.locator('[data-fob-field-name="how_are_you"]');
          await expect(formBuilderFieldLocator).toBeVisible();
          expect(
            await formBuilderFieldLocator.locator('[name="how_are_you"]').getAttribute("placeholder")
          ).toBe("I'm fine, thanks");
          expect(await getLabelText(formBuilderFieldLocator)).toBe("How are you?");
          await formBuilderFieldLocator.locator('[name="how_are_you"]').fill("I am great!");
          await bookTimeSlot({ page, name: "Booker", email: "booker@example.com" });
          await expect(page.locator("[data-testid=success-page]")).toBeVisible();

          expect(
            await page.locator('[data-testid="field-response"][data-fob-field="how_are_you"]').innerText()
          ).toBe("I am great!");

          await waitFor(() => {
            expect(webhookReceiver.requestList.length).toBe(1);
          });

          const [request] = webhookReceiver.requestList;

          const payload = (request.body as any).payload as any;

          expect(payload.responses).toMatchObject({
            email: {
              label: "email_address",
              value: "booker@example.com",
            },
            how_are_you: {
              label: "How are you?",
              value: "I am great!",
            },
            name: {
              label: "your_name",
              value: "Booker",
            },
          });

          expect(payload.location).toBe("integrations:daily");

          expect(payload.attendees[0]).toMatchObject({
            name: "Booker",
            email: "booker@example.com",
          });

          expect(payload.userFieldsResponses).toMatchObject({
            how_are_you: {
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
    await rescheduleFromTheLinkOnPage({ page, bookerVariant });
    await expectErrorToBeThereFor({ page, name: "rescheduleReason" });
  });
}

async function expectSystemFieldsToBeThere(page: Page) {
  const allFieldsLocator = page.locator("[data-fob-field-name]:not(.hidden)");
  const nameLocator = allFieldsLocator.nth(0);
  const emailLocator = allFieldsLocator.nth(1);
  // Location isn't rendered unless explicitly set which isn't the case here
  // const locationLocator = allFieldsLocator.nth(2);
  const additionalNotes = allFieldsLocator.nth(3);
  const guestsLocator = allFieldsLocator.nth(4);

  await expect(nameLocator.locator('[name="name"]')).toBeVisible();
  await expect(emailLocator.locator('[name="email"]')).toBeVisible();

  await expect(additionalNotes.locator('[name="notes"]')).toBeVisible();
  await expect(guestsLocator.locator("button")).toBeVisible();
  return allFieldsLocator;
}

//TODO: Add one question for each type and see they are rendering labels and only once and are showing appropriate native component
// Verify webhook is sent with the correct data, DB is correct (including metadata)

//TODO: Verify that prefill works
async function bookTimeSlot({ page, name, email }: { page: Page; name: string; email: string }) {
  // --- fill form
  await page.fill('[name="name"]', name);
  await page.fill('[name="email"]', email);
  await page.press('[name="email"]', "Enter");
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
    await page.fill('[name="label"]', question.label);
  }

  if (question.placeholder !== undefined) {
    await page.fill('[name="placeholder"]', question.placeholder);
  }

  if (question.required !== undefined) {
    // await page.fill('[name="name"]', question.required);
  }

  await page.click('[data-testid="field-add-save"]');
  await saveEventType(page);
}

async function expectErrorToBeThereFor({ page, name }: { page: Page; name: string }) {
  await expect(page.locator(`[data-testid=error-message-${name}]`)).toHaveCount(1);
  // TODO: We should either verify the error message or error code in the test so we know that the correct error is shown
  // Checking for the error message isn't well maintainable as translation can change and we might want to verify in non english language as well.
}

/**
 * Opens a fresh preview window and runs the callback on it giving it the preview tab's `page`
 */
async function doOnFreshPreview(
  page: Page,
  context: PlaywrightTestArgs["context"],
  bookerVariant: BookerVariants,
  callback: (page: Page) => Promise<void>,
  persistTab = false
) {
  const previewTabPage = await openBookingFormInPreviewTab(context, page, bookerVariant);
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
  await page.locator(`[data-testid="field-${name}"]`).locator('[data-testid="edit-field-action"]').click();
  await page
    .locator('[data-testid="edit-field-dialog"]')
    .locator('[data-testid="field-required"] button')
    .locator(`text=${required ? "Yes" : "No"}`)
    .click();
  await page.locator('[data-testid="field-add-save"]').click();
  await saveEventType(page);
}

async function createAndLoginUserWithEventTypes({ users }: { users: ReturnType<typeof createUsersFixture> }) {
  const user = await users.create(null, {
    hasTeam: true,
  });
  await user.login();
  return user;
}

async function rescheduleFromTheLinkOnPage({
  page,
  bookerVariant,
}: {
  page: Page;
  bookerVariant: BookerVariants;
}) {
  await page.locator('[data-testid="reschedule-link"]').click();
  await page.waitForLoadState();
  await selectFirstAvailableTimeSlotNextMonth(page);
  if (bookerVariant === "old-booker") {
    await page.waitForNavigation({
      url: (url) => url.pathname.endsWith("/book"),
    });
  }
  await page.click('[data-testid="confirm-reschedule-button"]');
}

async function openBookingFormInPreviewTab(
  context: PlaywrightTestArgs["context"],
  page: Page,
  bookerVariant: BookerVariants
) {
  const previewTabPromise = context.waitForEvent("page");
  await page.locator('[data-testid="preview-button"]').click();
  const previewTabPage = await previewTabPromise;
  await previewTabPage.waitForLoadState();
  await selectFirstAvailableTimeSlotNextMonth(previewTabPage);
  if (bookerVariant === "old-booker") {
    await previewTabPage.waitForNavigation({
      url: (url) => url.pathname.endsWith("/book"),
    });
  }
  return previewTabPage;
}

async function saveEventType(page: Page) {
  await page.locator("[data-testid=update-eventtype]").click();
}

async function addWebhook(user: Awaited<ReturnType<typeof createAndLoginUserWithEventTypes>>) {
  const webhookReceiver = createHttpServer();
  await prisma.webhook.create({
    data: {
      id: uuid(),
      userId: user.id,
      subscriberUrl: webhookReceiver.url,
      eventTriggers: [
        WebhookTriggerEvents.BOOKING_CREATED,
        WebhookTriggerEvents.BOOKING_CANCELLED,
        WebhookTriggerEvents.BOOKING_RESCHEDULED,
      ],
    },
  });
  return webhookReceiver;
}
