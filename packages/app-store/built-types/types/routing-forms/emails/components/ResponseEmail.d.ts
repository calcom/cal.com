/// <reference types="react" />
import type { App_RoutingForms_Form } from "@prisma/client";
import { BaseEmailHtml } from "@calcom/emails/src/components";
import type { OrderedResponses } from "../../types/types";
export declare const ResponseEmail: ({ form, orderedResponses, ...props }: {
    form: Pick<App_RoutingForms_Form, "id" | "name">;
    orderedResponses: OrderedResponses;
    subject: string;
} & Partial<{
    children: import("react").ReactNode;
    callToAction?: import("react").ReactNode;
    subject: string;
    title?: string | undefined;
    subtitle?: import("react").ReactNode;
    headerType?: import("@calcom/emails/src/components/EmailSchedulingBodyHeader").BodyHeadType | undefined;
    hideLogo?: boolean | undefined;
}>) => JSX.Element;
//# sourceMappingURL=ResponseEmail.d.ts.map