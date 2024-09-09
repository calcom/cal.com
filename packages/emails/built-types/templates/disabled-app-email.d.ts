import type { TFunction } from "next-i18next";
import BaseEmail from "./_base-email";
export default class DisabledAppEmail extends BaseEmail {
    email: string;
    appName: string;
    appType: string[];
    t: TFunction;
    title?: string;
    eventTypeId?: number;
    constructor(email: string, appName: string, appType: string[], t: TFunction, title?: string, eventTypeId?: number);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(): string;
}
//# sourceMappingURL=disabled-app-email.d.ts.map