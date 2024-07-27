import { WEBAPP_URL } from "@calcom/lib/constants";

/** This class extends the native URL and uses WEBAPP_URL as the base URL for creating object URLs */
export class WebAppURL extends URL {
  constructor(path: string | URL) {
    super(path, WEBAPP_URL);
  }
}
