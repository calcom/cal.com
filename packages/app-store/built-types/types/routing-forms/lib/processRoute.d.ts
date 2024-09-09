import type { App_RoutingForms_Form } from "@prisma/client";
import type { FormResponse, SerializableForm } from "../types/types";
export declare function processRoute({ form, response, }: {
    form: SerializableForm<App_RoutingForms_Form>;
    response: Record<string, Pick<FormResponse[string], "value">>;
}): any;
//# sourceMappingURL=processRoute.d.ts.map