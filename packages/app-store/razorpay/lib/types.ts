export interface RazorpayPaymentEntity {
  id: string;
  entity: "payment";
  amount: number;
  amount_refunded: number;
  amount_transferred: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  order_id: string | null;
  invoice_id: string | null;
  international: boolean;
  method: "card" | "netbanking" | "wallet" | "emi" | "upi";
  refund_status: null | "partial" | "full";
  captured: boolean;
  description: string;
  card_id: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  email: string;
  contact: string;
  customer_id: string | null;
  token_id: string | null;
  notes: Record<string, string>;
  fee: number | null;
  tax: number | null;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_step: string | null;
  error_reason: string | null;
  acquirer_data: Record<string, unknown>;
  created_at: number;
}


export interface RazorpayRefundEntity {
  id: string;
  entity: "refund";
  amount: number;
  currency: string;
  payment_id: string;
  notes: Record<string, string>;
  receipt: string | null;
  acquirer_data: Record<string, unknown>;
  status: "processed" | "failed" | "pending";
  speed_processed: string;
  speed_requested: string;
  created_at: number;
}


export interface RazorpayOrderEntity {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  offer_id: string | null;
  status: "created" | "attempted" | "paid";
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayPaymentStorageData {
  orderId: string;
  keyId?: string;
  paymentId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  receipt?: string | null;
  capturedAt?: string;
  authorizedAt?: string;
  failedAt?: string;
  errorCode?: string | null;
  errorDescription?: string | null;
  errorSource?: string | null;
  errorStep?: string | null;
  errorReason?: string | null;
  refundId?: string;
  refundAmount?: number;
  refundStatus?: string;
  refundedAt?: string;
  refundFailedAt?: string;
  [key: string]: unknown;
}

export interface RazorpayWebhookPayload {
  payment?: {
    entity: RazorpayPaymentEntity;
  };
  refund?: {
    entity: RazorpayRefundEntity;
  };
  order?: {
    entity: RazorpayOrderEntity;
  };
}

export interface RazorpayWebhookEvent {
  entity: "event";
  account_id: string;
  event:
  | "payment.authorized"
  | "payment.captured"
  | "payment.failed"
  | "refund.created"
  | "refund.processed"
  | "refund.failed"
  | "order.paid"
  | string;
  contains: string[];
  payload: RazorpayWebhookPayload;
  created_at: number;
}


export interface RazorpayCredentials {
  key_id: string;
  key_secret: string;
  webhook_secret?: string;
  default_currency: string;
}