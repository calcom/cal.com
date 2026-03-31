import type { LarkCalendarCredential } from "../calendar-adapter-types";

import { BaseByteDanceCalendarAdapter } from "./base-byte-dance-calendar-adapter";

export class LarkCalendarAdapter extends BaseByteDanceCalendarAdapter {
  protected readonly apiHost = "open.larksuite.com";
  protected readonly providerName = "Lark";

  constructor(credential: LarkCalendarCredential) {
    super(credential);
  }
}
