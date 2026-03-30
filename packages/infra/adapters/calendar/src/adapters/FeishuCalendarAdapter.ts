import type { FeishuCalendarCredential } from "../CalendarAdapterTypes";

import { BaseByteDanceCalendarAdapter } from "./BaseByteDanceCalendarAdapter";

export class FeishuCalendarAdapter extends BaseByteDanceCalendarAdapter {
  protected readonly apiHost = "open.feishu.cn";
  protected readonly providerName = "Feishu";

  constructor(credential: FeishuCalendarCredential) {
    super(credential);
  }
}
