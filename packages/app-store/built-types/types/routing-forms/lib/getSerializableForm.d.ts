import type { App_RoutingForms_Form } from "@prisma/client";
import type { SerializableForm } from "../types/types";
/**
 * Doesn't have deleted fields by default
 */
export declare function getSerializableForm<TForm extends App_RoutingForms_Form>({ form, withDeletedFields, }: {
    form: TForm;
    withDeletedFields?: boolean;
}): Promise<SerializableForm<TForm>>;
//# sourceMappingURL=getSerializableForm.d.ts.map