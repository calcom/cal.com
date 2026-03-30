import type { LarkCalendarCredential } from "../CalendarAdapterTypes";

import { BaseByteDanceCalendarAdapter } from "./BaseByteDanceCalendarAdapter";

export class LarkCalendarAdapter extends BaseByteDanceCalendarAdapter {
  protected readonly apiHost = "open.larksuite.com";
  protected readonly providerName = "Lark";

  constructor(credential: LarkCalendarCredential) {
    super(credential);
  }
}
