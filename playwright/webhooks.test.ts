import { kont } from "kont";
import _ from "lodash";

import { loginProvider } from "./lib/loginProvider";
import {
  createHttpServer,
  waitFor,
} from "./lib/testUtils";

jest.setTimeout(60e3);

const ctx = kont()
  .useBeforeEach(
    loginProvider({
      user: "pro",
      path: "/settings/embed",
    })
  )
  .done();

test("add webhook & test", async () => {
  const { page } = ctx;
  const server = createHttpServer();

  // --- add webhook
  await expect(page).toHaveSelector('[data-testid="new-webhook"]');
  await page.click('[data-testid="new-webhook"]');

  await page.fill('[name="subUrl"]', server.url);

  await page.click("[type=submit]");

  await expect(page).toHaveSelector(`text='${server.url}'`);

  // --- navigate to meeting form
  await page.goto("http://localhost:3000/pro/30min");

  await page.click("[data-testid=day]:not([data-disabled=true])");

  await page.click("[data-testid=time]");

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // --- fill form
  await page.fill('[name="name"]', "Test Testson");
  await page.fill('[name="email"]', "test@example.com");
  await page.press('[name="email"]', "Enter");

  // --- check that webhook was called
  await waitFor(() => {
    expect(server.requestList.length).toBe(1);
  });

  const [request] = server.requestList;
  const body = request.body as any;

  // remove dynamic properties
  const dynamic = "<<redacted - dynamic property that differs between different computers>>";
  body.createdAt = dynamic;
  body.payload.startTime = dynamic;
  body.payload.endTime = dynamic;
  for (const attendee of body.payload.attendees) {
    attendee.timeZone = dynamic;
  }
  body.payload.organizer.timeZone = dynamic;

  // if we change the shape of our webhooks, we can simply update this by clicking `u`
  expect(body).toMatchInlineSnapshot();

  server.close();
});
