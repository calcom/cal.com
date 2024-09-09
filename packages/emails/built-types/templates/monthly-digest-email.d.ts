import type { MonthlyDigestEmailData } from "../src/templates/MonthlyDigestEmail";
import BaseEmail from "./_base-email";
export default class MonthlyDigestEmail extends BaseEmail {
    eventData: MonthlyDigestEmailData;
    constructor(eventData: MonthlyDigestEmailData);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=monthly-digest-email.d.ts.map