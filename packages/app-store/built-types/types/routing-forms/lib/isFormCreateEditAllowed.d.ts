import type { App_RoutingForms_Form, User } from "@prisma/client";
export declare function isFormCreateEditAllowed({ formId, userId, 
/**
 * Valid when a new form is being created for a team
 */
targetTeamId, }: {
    userId: User["id"];
    formId: App_RoutingForms_Form["id"];
    targetTeamId: App_RoutingForms_Form["teamId"] | null;
}): Promise<boolean>;
//# sourceMappingURL=isFormCreateEditAllowed.d.ts.map