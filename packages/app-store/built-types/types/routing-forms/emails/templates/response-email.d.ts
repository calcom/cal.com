import type { App_RoutingForms_Form } from "@prisma/client";
import BaseEmail from "@calcom/emails/templates/_base-email";
import type { OrderedResponses } from "../../types/types";
type Form = Pick<App_RoutingForms_Form, "id" | "name">;
export default class ResponseEmail extends BaseEmail {
    orderedResponses: OrderedResponses;
    toAddresses: string[];
    form: Form;
    constructor({ toAddresses, orderedResponses, form, }: {
        form: Form;
        toAddresses: string[];
        orderedResponses: OrderedResponses;
    });
    protected getNodeMailerPayload(): Promise<Record<string, unknown>>;
}
export {};
//# sourceMappingURL=response-email.d.ts.map