/// <reference types="react" />
import { type TFunction } from "next-i18next";
type AdminOrganizationNotification = {
    language: TFunction;
    orgSlug: string;
    webappIPAddress: string;
};
export declare const AdminOrganizationNotificationEmail: ({ orgSlug, webappIPAddress, language, }: AdminOrganizationNotification) => JSX.Element;
export {};
//# sourceMappingURL=AdminOrganizationNotificationEmail.d.ts.map