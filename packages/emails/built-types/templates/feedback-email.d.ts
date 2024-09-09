import BaseEmail from "./_base-email";
export interface Feedback {
    username: string;
    email: string;
    rating: string;
    comment: string;
}
export default class FeedbackEmail extends BaseEmail {
    feedback: Feedback;
    constructor(feedback: Feedback);
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
    protected getTextBody(): string;
}
//# sourceMappingURL=feedback-email.d.ts.map