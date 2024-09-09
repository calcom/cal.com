import z from "zod";
declare class Paypal {
    url: string;
    clientId: string;
    secretKey: string;
    accessToken: string | null;
    expiresAt: number | null;
    constructor(opts: {
        clientId: string;
        secretKey: string;
    });
    private fetcher;
    getAccessToken(): Promise<void>;
    createOrder({ referenceId, amount, currency, returnUrl, cancelUrl, intent, }: {
        referenceId: string;
        amount: number;
        currency: string;
        returnUrl: string;
        cancelUrl: string;
        intent?: "CAPTURE" | "AUTHORIZE";
    }): Promise<CreateOrderResponse>;
    captureOrder(orderId: string): Promise<boolean>;
    createWebhook(): Promise<boolean | string>;
    listWebhooks(): Promise<string[]>;
    deleteWebhook(webhookId: string): Promise<boolean>;
    test(): Promise<boolean>;
    verifyWebhook(options: WebhookEventVerifyRequest): Promise<void>;
}
export default Paypal;
interface ExperienceContext {
    payment_method_preference?: string;
    payment_method_selected?: string;
    brand_name?: string;
    locale?: string;
    landing_page?: string;
    shipping_preference?: string;
    user_action: string;
    return_url: string;
    cancel_url: string;
}
interface PaymentSource {
    paypal: {
        experience_context: ExperienceContext;
    };
}
interface Link {
    href: string;
    rel: string;
    method: string;
}
interface CreateOrderResponse {
    id: string;
    status: string;
    payment_source: PaymentSource;
    links: Link[];
}
declare const webhookEventVerifyRequestSchema: z.ZodObject<{
    body: z.ZodObject<{
        auth_algo: z.ZodString;
        cert_url: z.ZodString;
        transmission_id: z.ZodString;
        transmission_sig: z.ZodString;
        transmission_time: z.ZodString;
        webhook_event: z.ZodString;
        webhook_id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        webhook_id: string;
        auth_algo: string;
        cert_url: string;
        transmission_id: string;
        transmission_sig: string;
        transmission_time: string;
        webhook_event: string;
    }, {
        webhook_id: string;
        auth_algo: string;
        cert_url: string;
        transmission_id: string;
        transmission_sig: string;
        transmission_time: string;
        webhook_event: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        webhook_id: string;
        auth_algo: string;
        cert_url: string;
        transmission_id: string;
        transmission_sig: string;
        transmission_time: string;
        webhook_event: string;
    };
}, {
    body: {
        webhook_id: string;
        auth_algo: string;
        cert_url: string;
        transmission_id: string;
        transmission_sig: string;
        transmission_time: string;
        webhook_event: string;
    };
}>;
export type WebhookEventVerifyRequest = z.infer<typeof webhookEventVerifyRequestSchema>;
//# sourceMappingURL=Paypal.d.ts.map