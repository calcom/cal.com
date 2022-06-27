import { expect } from "@playwright/test";

import { config } from "../../../_apps-playwright/config/playwright.config";

declare global {
  namespace PlaywrightTest {}
}

expect.extend({});
export default config;
