import { kont } from "kont";

import { loginProvider } from "./lib/loginProvider";

jest.setTimeout(60e3);
jest.retryTimes(2);

const ctx = kont()
  .useBeforeEach(
    loginProvider({
      user: "onboarding",
    })
  )
  .done();

test("redirects to /getting-started after login", async () => {
  await ctx.page.waitForNavigation({
    url(url) {
      return url.pathname === "/getting-started";
    },
  });
});
