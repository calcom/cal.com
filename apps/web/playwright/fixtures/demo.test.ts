import { UserPlan } from "@prisma/client";

import { prisma } from "@calcom/prisma";

import { test } from "../lib/fixtures";
import { TimeZoneE } from "./users";

// The purpose of this DEMO is to teach the created Playwright fixtures for Cal E2E tests.
// Check the final results of the users we are going to create in prisma studio.
const now = Date.now();

test.describe("Fixtures Demo", () => {
  test("Create some users with users fixture", async ({ page, users }) => {
    // Create 5 named users. The default plan is PRO.
    const pro = await users.create({ username: "pro" }); // pro-{{timestamp}}
    const free = await users.create({ username: "free", plan: UserPlan.FREE }); // free-{{timestamp}}
    const trial = await users.create({ username: "trial", plan: UserPlan.TRIAL }); // trial-{{timestamp}}
    const onboard = await users.create({ username: "onboard", completedOnboarding: false }); // onboard-{{timestamp}}
    const usa = await users.create({ username: "usa", timeZone: TimeZoneE.USA }); // usa-{{timestamp}}

    // You can customize username, plan, locale, onboarding (boolean), and timeZone
    // password is always equal to the username and email is {{username}}@example.com
    const custom = await users.create({
      username: "custom",
      plan: UserPlan.FREE,
      timeZone: TimeZoneE.USA,
      completedOnboarding: true, // true is the default
      locale: "es",
    });

    // You can create unnamed users as well. They will have the form of {{plan}}-{{timestamp}}
    // Note that naming a user with the plan has the same effect of using the unnamed defaults.
    const proUnnamed = await users.create(); // pro-{{timestamp}}
    const freeUnnamed = await users.create({ plan: UserPlan.FREE }); // free-{{timestamp}}

    // debug lets you inject debug information into the user metadata field (db)
    await pro.debug({ project: "demo", env: "CI" });

    // Using self() you can retrieve the Prisma object that references the user fixture
    // Let's check the debug information we've just written.
    console.log("user.debug() - Check what debug information we have injected");
    console.log((await pro.self()).metadata);

    // users.get() retrieves the collecion of all the users created in the test
    console.log("user.get() - show the usernames of all our created users");
    await Promise.all(users.get().map(async (user) => console.log((await user.self()).username)));

    // user.id retrieves the id of the user in (sync) in case you need to make fast queries with Prisma
    console.log("user.id - get the email of PRO using the 'id' from the users fixture");
    console.log(await prisma.user.findUnique({ select: { email: true }, where: { id: pro.id } }));
  }),
    test("Login users", async ({ page, users }) => {
      // We create a new set of users for this test
      const one = await users.create({ username: "one" });
      const two = await users.create({ username: "two" });
      const three = await users.create({ username: "thee" });

      // you don't have to worry about the log-out for the current user. It is already included in the login method.
      // Timeout is for the purpose of this DEMO. You don't need it in your tests.
      await one.login();
      await page.goto("/settings/profile");
      await page.waitForTimeout(5000);
      await two.login();
      await page.goto("/settings/profile");
      await page.waitForTimeout(5000);
      await three.login();
      await page.goto("/settings/profile");
      await page.waitForTimeout(5000);

      // you use the "users" fixture to create an anonymous session
      await users.logout();
      await page.waitForTimeout(3000);
      await page.goto("/");
      await page.waitForTimeout(3000);
    });
});
