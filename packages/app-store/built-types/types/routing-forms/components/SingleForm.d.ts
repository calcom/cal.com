/// <reference types="react" />
import type { App_RoutingForms_Form, Team } from "@prisma/client";
import type { UseFormReturn } from "react-hook-form";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import type { SerializableForm } from "../types/types";
import { getServerSidePropsForSingleFormView } from "./getServerSidePropsSingleForm";
type RoutingForm = SerializableForm<App_RoutingForms_Form>;
export type RoutingFormWithResponseCount = RoutingForm & {
    team: {
        slug: Team["slug"];
        name: Team["name"];
    } | null;
    _count: {
        responses: number;
    };
};
type SingleFormComponentProps = {
    form: RoutingFormWithResponseCount;
    appUrl: string;
    Page: React.FC<{
        form: RoutingFormWithResponseCount;
        appUrl: string;
        hookForm: UseFormReturn<RoutingFormWithResponseCount>;
    }>;
    enrichedWithUserProfileForm?: inferSSRProps<typeof getServerSidePropsForSingleFormView>["enrichedWithUserProfileForm"];
};
export default function SingleFormWrapper({ form: _form, ...props }: SingleFormComponentProps): JSX.Element | null;
export { getServerSidePropsForSingleFormView };
//# sourceMappingURL=SingleForm.d.ts.map