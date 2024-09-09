import type { IConnectionAPIController, IOAuthController, ISPSSOConfig, IDirectorySyncController } from "@boxyhq/saml-jackson";
declare global {
    var connectionController: IConnectionAPIController | undefined;
    var oauthController: IOAuthController | undefined;
    var samlSPConfig: ISPSSOConfig | undefined;
    var dsyncController: IDirectorySyncController | undefined;
}
export default function init(): Promise<{
    connectionController: IConnectionAPIController;
    oauthController: IOAuthController;
    samlSPConfig: ISPSSOConfig;
    dsyncController: {
        users: import("@boxyhq/saml-jackson/dist/directory-sync/scim/Users").Users;
        groups: import("@boxyhq/saml-jackson/dist/directory-sync/scim/Groups").Groups;
        directories: import("@boxyhq/saml-jackson/dist/directory-sync/scim/DirectoryConfig").DirectoryConfig;
        webhookLogs: import("@boxyhq/saml-jackson/dist/directory-sync/scim/WebhookEventsLogger").WebhookEventsLogger;
        requests: import("@boxyhq/saml-jackson/dist/directory-sync/request").RequestHandler;
        providers: () => {
            [K: string]: string;
        };
        events: {
            callback: (event: import("@boxyhq/saml-jackson").DirectorySyncEvent) => Promise<void>;
            batch: import("@boxyhq/saml-jackson/dist/directory-sync/batch-events/queue").EventProcessor;
        };
        google: import("@boxyhq/saml-jackson/dist/directory-sync/non-scim/google/oauth").GoogleAuth;
        sync: (callback: import("@boxyhq/saml-jackson").EventCallback) => Promise<void>;
    };
}>;
//# sourceMappingURL=jackson.d.ts.map