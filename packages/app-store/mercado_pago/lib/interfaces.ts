export interface IMercadoPagoPaymentComponentProps {
  payment: {
    amount: number;
    appId: string;
    bookingId: number;
    currency: string;
    data: MercadoPagoPaymentResponse;
    paymentOption: string;
    refunded: boolean;
    success: boolean;
    uid: string;
  };
  eventType: EventType;
  user: User;
  location?: string | null;
  bookingId: number;
  bookingUid: string;
}

interface MercadoPagoPaymentResponse {
  additional_info: string;
  auto_return: string;
  back_urls: {
    failure: string;
    pending: string;
    success: string;
  };
  binary_mode: boolean;
  client_id: string;
  collector_id: number;
  coupon_code: null;
  coupon_labels: null;
  date_created: string;
  date_of_expiration: null;
  expiration_date_from: null;
  expiration_date_to: null;
  expires: boolean;
  external_reference: string;
  id: string;
  init_point: string;
  internal_metadata: null;
  items: object[];
  last_updated: null;
  marketplace: string;
  marketplace_fee: number;
  metadata: object;
  notification_url: null;
  operation_type: string;
  payer: {
    name: string;
    email: string;
    phone: object;
    address: object;
    surname: string;
  };
  payment_methods: {
    installments: null;
    default_card_id: null;
    default_installments: null;
    excluded_payment_types: string[];
    excluded_payment_methods: string[];
  };
  processing_modes: null;
  product_id: null;
  redirect_urls: {
    failure: string;
    pending: string;
    success: string;
  };
  sandbox_init_point: string;
  shipments: {
    receiver_address: object;
    default_shipping_method: null;
  };
  site_id: string;
  stripeAccount: string;
  stripe_publishable_key: string;
  total_amount: null;
}
