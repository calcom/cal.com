/// <reference types="react" />
import { BaseEmailHtml } from "../components";
export interface Feedback {
    username: string;
    email: string;
    rating: string;
    comment: string;
}
export declare const FeedbackEmail: (props: Feedback & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => JSX.Element;
//# sourceMappingURL=FeedbackEmail.d.ts.map