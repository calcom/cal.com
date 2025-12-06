export interface RazorpayOrderData {
    orderId: string;
    keyId: string;
    amount: number;
    currency: string;
}

export interface RazorpayPaymentData extends RazorpayOrderData {
    paymentId?: string;
    signature?: string;
}