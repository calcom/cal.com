/// <reference types="react" />
import type { App_RoutingForms_Form } from "@prisma/client";
import { z } from "zod";
import type { ButtonProps } from "@calcom/ui";
import type { SerializableForm } from "../types/types";
type RoutingForm = SerializableForm<App_RoutingForms_Form>;
declare const newFormModalQuerySchema: z.ZodObject<{
    action: z.ZodUnion<[z.ZodLiteral<"new">, z.ZodLiteral<"duplicate">]>;
    target: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: "duplicate" | "new";
    target?: string | undefined;
}, {
    action: "duplicate" | "new";
    target?: string | undefined;
}>;
export declare const useOpenModal: () => (option: z.infer<typeof newFormModalQuerySchema>) => void;
export declare const FormActionsDropdown: ({ children, disabled, }: {
    disabled?: boolean | undefined;
    children: React.ReactNode;
}) => JSX.Element;
export declare function FormActionsProvider({ appUrl, children }: {
    appUrl: string;
    children: React.ReactNode;
}): JSX.Element;
type FormActionType = "preview" | "edit" | "copyLink" | "toggle" | "_delete" | "embed" | "duplicate" | "download" | "copyRedirectUrl" | "create";
type FormActionProps<T> = {
    routingForm: RoutingForm | null;
    as?: T;
    label?: string;
    action: FormActionType;
    children?: React.ReactNode;
    render?: (props: {
        routingForm: RoutingForm | null;
        className?: string;
        label?: string;
        disabled?: boolean | null | undefined;
    }) => JSX.Element;
    extraClassNames?: string;
} & ButtonProps;
export declare const FormAction: import("react").ForwardRefExoticComponent<FormActionProps<import("react").ForwardRefExoticComponent<ButtonProps & import("react").RefAttributes<HTMLButtonElement | HTMLAnchorElement>>> & import("react").RefAttributes<HTMLButtonElement | HTMLAnchorElement>>;
export {};
//# sourceMappingURL=FormActions.d.ts.map