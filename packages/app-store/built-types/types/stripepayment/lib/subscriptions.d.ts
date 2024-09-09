interface IRetrieveSubscriptionIdResponse {
    message?: string;
    subscriptionId?: string;
}
export declare function retrieveSubscriptionIdFromStripeCustomerId(stripeCustomerId: string): Promise<IRetrieveSubscriptionIdResponse>;
export {};
//# sourceMappingURL=subscriptions.d.ts.map