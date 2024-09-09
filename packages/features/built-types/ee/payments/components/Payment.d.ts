/// <reference types="react" />
import type { Payment } from "@prisma/client";
import type { EventType } from "@prisma/client";
import type { PaymentPageProps } from "../pages/payment";
type Props = {
    payment: Omit<Payment, "id" | "fee" | "success" | "refunded" | "externalId" | "data"> & {
        data: Record<string, unknown>;
    };
    eventType: {
        id: number;
        successRedirectUrl: EventType["successRedirectUrl"];
        forwardParamsSuccessRedirect: EventType["forwardParamsSuccessRedirect"];
    };
    user: {
        username: string | null;
    };
    location?: string | null;
    clientSecret: string;
    booking: PaymentPageProps["booking"];
};
export default function PaymentComponent(props: Props): JSX.Element;
export {};
//# sourceMappingURL=Payment.d.ts.map