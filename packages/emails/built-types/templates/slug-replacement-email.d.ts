import type { TFunction } from "next-i18next";
import BaseEmail from "./_base-email";
export default class SlugReplacementEmail extends BaseEmail {
    email: string;
    name: string;
    teamName: string | null;
    slug: string;
    t: TFunction;
    constructor(email: string, name: string, teamName: string | null, slug: string, t: TFunction);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(): string;
}
//# sourceMappingURL=slug-replacement-email.d.ts.map