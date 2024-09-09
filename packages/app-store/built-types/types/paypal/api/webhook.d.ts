import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
export declare const config: {
    api: {
        bodyParser: boolean;
    };
};
export declare function handlePaypalPaymentSuccess(payload: z.infer<typeof eventSchema>, rawPayload: string, webhookHeaders: WebHookHeadersType): Promise<void>;
export default function handler(req: NextApiRequest, res: NextApiResponse): Promise<void>;
declare const eventSchema: z.ZodObject<{
    id: z.ZodString;
    create_time: z.ZodString;
    resource_type: z.ZodString;
    event_type: z.ZodString;
    summary: z.ZodString;
    resource: z.ZodObject<{
        create_time: z.ZodString;
        id: z.ZodString;
        payment_source: z.ZodObject<{
            paypal: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
            paypal?: {} | undefined;
        }, {
            paypal?: {} | undefined;
        }>;
        intent: z.ZodString;
        payer: z.ZodObject<{
            email_address: z.ZodString;
            payer_id: z.ZodString;
            address: z.ZodObject<{
                country_code: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                country_code: string;
            }, {
                country_code: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }>;
        status: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        create_time: z.ZodString;
        id: z.ZodString;
        payment_source: z.ZodObject<{
            paypal: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
            paypal?: {} | undefined;
        }, {
            paypal?: {} | undefined;
        }>;
        intent: z.ZodString;
        payer: z.ZodObject<{
            email_address: z.ZodString;
            payer_id: z.ZodString;
            address: z.ZodObject<{
                country_code: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                country_code: string;
            }, {
                country_code: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }>;
        status: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        create_time: z.ZodString;
        id: z.ZodString;
        payment_source: z.ZodObject<{
            paypal: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
            paypal?: {} | undefined;
        }, {
            paypal?: {} | undefined;
        }>;
        intent: z.ZodString;
        payer: z.ZodObject<{
            email_address: z.ZodString;
            payer_id: z.ZodString;
            address: z.ZodObject<{
                country_code: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                country_code: string;
            }, {
                country_code: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }>;
        status: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    status: z.ZodOptional<z.ZodString>;
    event_version: z.ZodString;
    resource_version: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodString;
    create_time: z.ZodString;
    resource_type: z.ZodString;
    event_type: z.ZodString;
    summary: z.ZodString;
    resource: z.ZodObject<{
        create_time: z.ZodString;
        id: z.ZodString;
        payment_source: z.ZodObject<{
            paypal: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
            paypal?: {} | undefined;
        }, {
            paypal?: {} | undefined;
        }>;
        intent: z.ZodString;
        payer: z.ZodObject<{
            email_address: z.ZodString;
            payer_id: z.ZodString;
            address: z.ZodObject<{
                country_code: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                country_code: string;
            }, {
                country_code: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }>;
        status: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        create_time: z.ZodString;
        id: z.ZodString;
        payment_source: z.ZodObject<{
            paypal: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
            paypal?: {} | undefined;
        }, {
            paypal?: {} | undefined;
        }>;
        intent: z.ZodString;
        payer: z.ZodObject<{
            email_address: z.ZodString;
            payer_id: z.ZodString;
            address: z.ZodObject<{
                country_code: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                country_code: string;
            }, {
                country_code: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }>;
        status: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        create_time: z.ZodString;
        id: z.ZodString;
        payment_source: z.ZodObject<{
            paypal: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
            paypal?: {} | undefined;
        }, {
            paypal?: {} | undefined;
        }>;
        intent: z.ZodString;
        payer: z.ZodObject<{
            email_address: z.ZodString;
            payer_id: z.ZodString;
            address: z.ZodObject<{
                country_code: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                country_code: string;
            }, {
                country_code: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }>;
        status: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    status: z.ZodOptional<z.ZodString>;
    event_version: z.ZodString;
    resource_version: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodString;
    create_time: z.ZodString;
    resource_type: z.ZodString;
    event_type: z.ZodString;
    summary: z.ZodString;
    resource: z.ZodObject<{
        create_time: z.ZodString;
        id: z.ZodString;
        payment_source: z.ZodObject<{
            paypal: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
            paypal?: {} | undefined;
        }, {
            paypal?: {} | undefined;
        }>;
        intent: z.ZodString;
        payer: z.ZodObject<{
            email_address: z.ZodString;
            payer_id: z.ZodString;
            address: z.ZodObject<{
                country_code: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                country_code: string;
            }, {
                country_code: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }>;
        status: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        create_time: z.ZodString;
        id: z.ZodString;
        payment_source: z.ZodObject<{
            paypal: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
            paypal?: {} | undefined;
        }, {
            paypal?: {} | undefined;
        }>;
        intent: z.ZodString;
        payer: z.ZodObject<{
            email_address: z.ZodString;
            payer_id: z.ZodString;
            address: z.ZodObject<{
                country_code: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                country_code: string;
            }, {
                country_code: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }>;
        status: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        create_time: z.ZodString;
        id: z.ZodString;
        payment_source: z.ZodObject<{
            paypal: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
            paypal?: {} | undefined;
        }, {
            paypal?: {} | undefined;
        }>;
        intent: z.ZodString;
        payer: z.ZodObject<{
            email_address: z.ZodString;
            payer_id: z.ZodString;
            address: z.ZodObject<{
                country_code: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                country_code: string;
            }, {
                country_code: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }, {
            address: {
                country_code: string;
            };
            email_address: string;
            payer_id: string;
        }>;
        status: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    status: z.ZodOptional<z.ZodString>;
    event_version: z.ZodString;
    resource_version: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
declare const webhookHeadersSchema: z.ZodObject<{
    "paypal-auth-algo": z.ZodString;
    "paypal-cert-url": z.ZodString;
    "paypal-transmission-id": z.ZodString;
    "paypal-transmission-sig": z.ZodString;
    "paypal-transmission-time": z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    "paypal-auth-algo": z.ZodString;
    "paypal-cert-url": z.ZodString;
    "paypal-transmission-id": z.ZodString;
    "paypal-transmission-sig": z.ZodString;
    "paypal-transmission-time": z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    "paypal-auth-algo": z.ZodString;
    "paypal-cert-url": z.ZodString;
    "paypal-transmission-id": z.ZodString;
    "paypal-transmission-sig": z.ZodString;
    "paypal-transmission-time": z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
type WebHookHeadersType = z.infer<typeof webhookHeadersSchema>;
export declare const findPaymentCredentials: (bookingId: number) => Promise<{
    clientId: string;
    secretKey: string;
    webhookId: string;
}>;
export {};
//# sourceMappingURL=webhook.d.ts.map