import type { App_RoutingForms_Form } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";
import type { SerializableForm, FormResponse } from "../types/types";
type Props = {
    form: SerializableForm<App_RoutingForms_Form>;
    response: FormResponse;
    setResponse: Dispatch<SetStateAction<FormResponse>>;
};
export default function FormInputFields(props: Props): JSX.Element;
export {};
//# sourceMappingURL=FormInputFields.d.ts.map