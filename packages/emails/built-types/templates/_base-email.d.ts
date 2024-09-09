export default class BaseEmail {
    name: string;
    protected getTimezone(): string;
    protected getLocale(): string;
    protected getFormattedRecipientTime({ time, format }: {
        time: string;
        format: string;
    }): string;
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    sendEmail(): Promise<unknown>;
    protected getMailerOptions(): {
        transport: string | import("nodemailer/lib/sendmail-transport").Options | import("nodemailer/lib/smtp-connection").Options;
        from: string | undefined;
        headers: {
            [subKey: string]: string;
        };
    };
    protected printNodeMailerError(error: Error): void;
}
//# sourceMappingURL=_base-email.d.ts.map