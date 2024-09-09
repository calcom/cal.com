import type { App_RoutingForms_Form, User } from "@prisma/client";
import type { Ensure } from "@calcom/types/utils";
import type { OrderedResponses } from "../types/types";
import type { FormResponse, SerializableForm } from "../types/types";
export declare function onFormSubmission(form: Ensure<SerializableForm<App_RoutingForms_Form> & {
    user: Pick<User, "id" | "email">;
    userWithEmails?: string[];
}, "fields">, response: FormResponse): Promise<void>;
export declare const sendResponseEmail: (form: Pick<App_RoutingForms_Form, "id" | "name">, orderedResponses: OrderedResponses, toAddresses: string[]) => Promise<void>;
//# sourceMappingURL=utils.d.ts.map