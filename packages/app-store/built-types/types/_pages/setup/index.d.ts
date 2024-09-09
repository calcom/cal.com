/// <reference types="react" />
export declare const AppSetupMap: {
    alby: import("react").ComponentType<import("../../alby/pages/setup").IAlbySetupProps>;
    "apple-calendar": import("react").ComponentType<{}>;
    exchange: import("react").ComponentType<{}>;
    "exchange2013-calendar": import("react").ComponentType<{}>;
    "exchange2016-calendar": import("react").ComponentType<{}>;
    "caldav-calendar": import("react").ComponentType<{}>;
    "ics-feed": import("react").ComponentType<{}>;
    zapier: import("react").ComponentType<import("../../zapier/pages/setup").IZapierSetupProps>;
    make: import("react").ComponentType<{
        inviteLink: string;
    }>;
    closecom: import("react").ComponentType<{}>;
    sendgrid: import("react").ComponentType<{}>;
    stripe: import("react").ComponentType<{}>;
    paypal: import("react").ComponentType<{}>;
};
export declare const AppSetupPage: (props: {
    slug: string;
}) => JSX.Element;
export default AppSetupPage;
//# sourceMappingURL=index.d.ts.map