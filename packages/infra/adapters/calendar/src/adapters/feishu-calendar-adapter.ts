import type { FeishuCalendarCredential } from "../calendar-adapter-types";

import { BaseByteDanceCalendarAdapter } from "./base-byte-dance-calendar-adapter";

export class FeishuCalendarAdapter extends BaseByteDanceCalendarAdapter {
  protected readonly apiHost = "open.feishu.cn";
  protected readonly providerName = "Feishu";

  constructor(credential: FeishuCalendarCredential) {
    super(credential);
  }
}
