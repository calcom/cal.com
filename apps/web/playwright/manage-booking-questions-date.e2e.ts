import type { Page, PlaywrightTestArgs, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import type { createUsersFixture } from "playwright/fixtures/users";
import { uuid } from "short-uuid";

import prisma from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";
import { createHttpServer, selectFirstAvailableTimeSlotNextMonth, submitAndWaitForResponse } from "./lib/testUtils";

function getLabelLocator(field: Locator) {
    return field.locator("label").first();
}

async function getLabelText(field: Locator) {
    return await getLabelLocator(field).locator("span").first().innerText();
}

test.describe.configure({ mode: "parallel" });
test.describe("Manage Booking Questions - Date Type", () => {
    test.afterEach(async ({ users }) => {
        await users.deleteAll();
    });

    test.describe("For User EventType", () => {
        test("Do a booking with a Date type question and verify a few things in b/w", async ({
            page,
            users,
            context,
        }, testInfo) => {
            test.setTimeout(testInfo.timeout * 2);
            const user = await createAndLoginUserWithEventTypes({ users, page });

            const webhookReceiver = await addWebhook(user);

            await test.step("Go to EventType Advanced Page", async () => {
                const $eventTypes = page.locator("[data-testid=event-types] > li a");
                const firstEventTypeElement = $eventTypes.first();

                await firstEventTypeElement.click();
                await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");
                await page.getByTestId("vertical-tab-event_advanced_tab_title").click();
            });

            await test.step("Add Date Question and verify it's shown on Booking Page", async () => {
                await addQuestionAndSave({
                    page,
                    question: {
                        name: "appointment-date",
                        type: "Date",
                        label: "Preferred Appointment Date",
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
                });
            });

            await test.step("Test Date picker opens and closes", async () => {
                await doOnFreshPreview(page, context, async (page) => {
                    const dateFieldLocator = page.locator('[data-fob-field-name="appointment-date"]');
                    const datePickerButton = dateFieldLocator.locator('[data-testid="pick-date"]');

                    await datePickerButton.click();
                    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
                    await expect(page.locator('[role="grid"]').first()).toBeVisible();

                    await page.keyboard.press('Escape');
                    await expect(page.locator('[role="dialog"]').first()).toBeHidden();
                });
            });

            await test.step("Test required field validation", async () => {
                await doOnFreshPreview(page, context, async (page) => {
                    await bookTimeSlot({ page, name: "Booker", email: "booker@example.com", });
                    await expectErrorToBeThereFor({ page, name: "appointment-date" });
                });
            });

            await test.step("Test date selection and format", async () => {
                await doOnFreshPreview(page, context, async (page) => {
                    const dateFieldLocator = page.locator('[data-fob-field-name="appointment-date"]');
                    const datePickerButton = dateFieldLocator.locator('[data-testid="pick-date"]');

                    await page.waitForLoadState('networkidle');
                    await datePickerButton.waitFor({ state: 'visible' });
                    await datePickerButton.click();

                    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
                    await expect(page.locator('[role="grid"]').first()).toBeVisible();

                    const nextMonthButton = page.locator('[role="dialog"]').first().getByTestId("datepicker-next-month");
                    if (await nextMonthButton.isVisible()) {
                        await nextMonthButton.click();
                        await page.waitForTimeout(500);
                    }

                    await page.locator('[role="grid"]').first().locator('[role="gridcell"]:not([aria-disabled="true"]):not([data-outside="true"]):not([data-hidden="true"])').first().click();

                    await expect(datePickerButton).not.toContainText("Pick a date");
                    const buttonText = await datePickerButton.textContent();
                    expect(buttonText).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
                });
            });

            await test.step("Complete booking and verify date format in webhook", async () => {
                await doOnFreshPreview(page, context, async (page) => {
                    const dateFieldLocator = page.locator('[data-fob-field-name="appointment-date"]');
                    const datePickerButton = dateFieldLocator.locator('[data-testid="pick-date"]');

                    await datePickerButton.click();

                    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
                    await expect(page.locator('[role="grid"]').first()).toBeVisible();

                    const nextMonthButton = page.locator('[role="dialog"]').first().getByTestId("datepicker-next-month");
                    if (await nextMonthButton.isVisible()) {
                        await nextMonthButton.click();
                        await page.waitForTimeout(500);
                    }

                    await page.locator('[role="grid"]').first().locator('[role="gridcell"]:not([aria-disabled="true"]):not([data-outside="true"]):not([data-hidden="true"])').first().click();

                    await expect(datePickerButton).not.toContainText("Pick a date");
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

                const prefillDate = futureDate.toISOString().split("T")[0];
                const expectedDisplayDate = new Date(prefillDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
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
                    await bookTimeSlot({ page, name: "Booker Optional", email: "booker.optional@example.com", });
                    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
                });
            });
        });
    });
});

async function expectSystemFieldsToBeThereOnBookingPage({ page }: { page: Page }) {
    const nameLocator = page.locator('[data-fob-field-name="name"]');
    const emailLocator = page.locator('[data-fob-field-name="email"]');
    const additionalNotes = page.locator('[data-fob-field-name="notes"]');
    const guestsLocator = page.locator('[data-fob-field-name="guests"]');

    await expect(nameLocator.locator('[name="name"]')).toBeVisible();
    await expect(emailLocator.locator('[name="email"]')).toBeVisible();
    await expect(additionalNotes.locator('[name="notes"]')).toBeVisible();
    await expect(guestsLocator.locator("[data-testid='add-guests']")).toBeVisible();
}

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


function getFieldTypeValue(label: string): string {

    const labelToValueMap: Record<string, string> = {
        "Date": "date",
        "Address": "address",
        "Checkbox": "boolean",
        "Checkbox Group": "checkbox",
        "Long Text": "textarea",
        "Short Text": "text",
        "Multiple Emails": "multiemail",
        "MultiSelect": "multiselect",
        "Radio Group": "radio",
    };

    return labelToValueMap[label] || label.toLowerCase();
}

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
    const optionValue = getFieldTypeValue(optionText);
    await page.getByTestId(`select-option-${optionValue}`).click();
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
    }

    await page.click('[data-testid="field-add-save"]');
    await saveEventType(page);
}


async function expectErrorToBeThereFor({ page, name }: { page: Page; name: string }) {
    await expect(page.locator(`[data-testid=error-message-${name}]`)).toHaveCount(1);
}

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
    previewUrlObj.searchParams.set("overlayCalendar", "false");
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
    await page.waitForSelector('[data-testid="event-types"]');
    return user;
}

async function openBookingFormInPreviewTab(context: PlaywrightTestArgs["context"], page: Page) {
    const href = (await page.locator('[data-testid="preview-button"]').getAttribute("href")) || "";
    const base = await page.url();
    const targetUrl = new URL(href, base);
    targetUrl.searchParams.set("overlayCalendar", "false");

    const previewTabPage = await context.newPage();
    await previewTabPage.goto(targetUrl.toString());
    await previewTabPage.waitForLoadState();
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

