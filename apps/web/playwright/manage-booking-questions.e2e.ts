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
      // Considering there are many steps in it, it would need more than default test timeout
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
      // Considering there are many steps in it, it would need more than default test timeout
      test.setTimeout(testInfo.timeout * 2);
      const user = await createAndLoginUserWithEventTypes({ users, page });

      // const webhookReceiver = await addWebhook(user);

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
          // Verify that markdown is working
          expect(await getLabelLocator(userFieldLocator).locator("a").getAttribute("href")).toBe(
            "https://example.com/terms"
          );
          await expect(userFieldLocator.locator("input")).toBeVisible();
        });
      });
    });

    test("Split 'Full name' into 'First name' and 'Last name'", async ({
      page,
      users,
      context,
    }, testInfo) => {
      // Considering there are many steps in it, it would need more than default test timeout
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
    // It is conditional
    // await page.locator("data-testid=field-location").isVisible();
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
  // Location isn't rendered unless explicitly set which isn't the case here
  // const locationLocator = allFieldsLocator.nth(2);
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
}: {
  page: Page;
  name?: string | { firstName: string; lastName?: string };
  email?: string;
  skipSubmission?: boolean;
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
  await page.locator(`[data-testid="field-${name}"]`).locator('[data-testid="edit-field-action"]').click();
  await page
    .locator('[data-testid="edit-field-dialog"]')
    .locator('[data-testid="field-required"]')
    .first()
    .click();
  await page.locator('[data-testid="field-add-save"]').click();
  await saveEventType(page);
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
  await page.locator('[data-testid="confirm-reschedule-button"]').click();
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
      await page.getByTestId("select-option-textarea").click();

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
