type Subscription = {
    endpoint: string;
    keys: {
        auth: string;
        p256dh: string;
    };
};
export declare const sendNotification: ({ subscription, title, body, icon, }: {
    subscription: Subscription;
    title: string;
    body: string;
    icon?: string | undefined;
}) => Promise<void>;
export {};
//# sourceMappingURL=sendNotification.d.ts.map