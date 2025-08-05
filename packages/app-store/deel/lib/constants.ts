import { isENVDev } from "@calcom/lib/env";

export const deelApiUrl = isENVDev ? "https://api-sandbox.demo.deel.com" : "https://api.letsdeel.com";
export const deelAuthUrl = isENVDev ? "https://demo.deel.com" : "https://app.deel.com";
