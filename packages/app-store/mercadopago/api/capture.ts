import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { IS_PRODUCTION } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") throw new Error("Invalid method");

  try {
    // Look if bookingUid it's provided in query params using zod
    const parseRequest = captureRequestSchema.safeParse(req.query);
    if (!parseRequest.success) {
      throw new Error("Request is malformed");
    }

    // Get paymentUID
    const { external_reference } = parseRequest.data;

    // Get booking credentials
    const booking = await prisma.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    const credentials = await findPaymentCredentials(booking?.id);

    if (!credentials) {
      throw new Error("Credentials not found");
    }

    // Get paypal instance
    const paypalClient = new Paypal(credentials);

    // capture payment
    const capture = await paypalClient.captureOrder(token);

    if (!capture) {
      res.redirect(`/booking/${bookingUid}?paypalPaymentStatus=failed`);
    }
    if (IS_PRODUCTION) {
      res.redirect(`/booking/${bookingUid}?paypalPaymentStatus=success`);
    } else {
      // For cal.dev, paypal sandbox doesn't send webhooks
      const updateBooking = prisma.booking.update({
        where: {
          uid: bookingUid,
        },
        data: {
          paid: true,
        },
      });
      const updatePayment = prisma.payment.update({
        where: {
          id: booking?.id,
        },
        data: {
          success: true,
        },
      });
      await Promise.all([updateBooking, updatePayment]);
      res.redirect(`/booking/${bookingUid}?paypalPaymentStatus=success`);
    }
    return;
  } catch (_err) {
    res.redirect(`/booking/${req.query.bookingUid}?paypalPaymentStatus=failed`);
  }
}

const captureRequestSchema = z.object({
  external_reference: z.string().uuid(),
  collection_id: z.preprocess(Number, z.number().int()),
  collection_status: z.string(),
  payment_id: z.preprocess(Number, z.number().int()),
  status: z.string(),
  payment_type: z.string(),
  merchant_order_id: z.preprocess(Number, z.number().int()),
  preference_id: z.string(),
  site_id: z.string(),
  processing_mode: z.string(),
});
// mercadoPagoPaymentStatus=success&collection_id=1317707223&collection_status=approved&payment_id=1317707223&status=approved&external_reference=66ea31e7-6cc7-43ec-9f59-079d9d4c053e&payment_type=credit_card&merchant_order_id=11622540370&preference_id=335900825-e417f001-5489-42f9-8c3b-aef5149499cf&site_id=MPE&processing_mode=aggregator&merchant_account_id=null
const payment = {
  accounts_info: null,
  additional_info: {
    authentication_code: null,
    available_balance: null,
    ip_address: "181.65.19.242",
    items: [
      {
        category_id: "services",
        description: null,
        id: "2",
        picture_url: null,
        quantity: "1",
        title: "60min between Free First Hidden Example and Free First Hidden Example",
        unit_price: "10",
      },
    ],
    nsu_processadora: null,
  },
  authorization_code: null,
  binary_mode: false,
  brand_id: null,
  build_version: "3.15.1",
  call_for_authorize_id: null,
  captured: true,
  card: {
    cardholder: { identification: { number: "70246112", type: "DNI" }, name: "Tester Test" },
    date_created: "2023-09-07T11:21:10.000-04:00",
    date_last_updated: "2023-09-07T11:21:10.000-04:00",
    expiration_month: 11,
    expiration_year: 2025,
    first_six_digits: "450995",
    id: null,
    last_four_digits: "3704",
  },
  charges_details: [],
  collector_id: 335900825,
  corporation_id: null,
  counter_currency: null,
  coupon_amount: 0,
  currency_id: "PEN",
  date_approved: "2023-09-07T11:21:10.747-04:00",
  date_created: "2023-09-07T11:21:10.525-04:00",
  date_last_updated: "2023-09-07T11:21:10.747-04:00",
  date_of_expiration: null,
  deduction_schema: null,
  description: "60min between Free First Hidden Example and Free First Hidden Example",
  differential_pricing_id: null,
  external_reference: "66ea31e7-6cc7-43ec-9f59-079d9d4c053e",
  fee_details: [{ amount: 1.65, fee_payer: "collector", type: "mercadopago_fee" }],
  financing_group: null,
  id: 1317707223,
  installments: 1,
  integrator_id: null,
  issuer_id: "1056",
  live_mode: false,
  marketplace_owner: 335900825,
  merchant_account_id: null,
  merchant_number: null,
  metadata: {
    booking_id: 40,
    identifier: "cal.com",
    event_name: "60min between Free First Hidden Example and Free First Hidden Example",
    booker_email: "free-first-hidden@example.com",
  },
  money_release_date: "2023-09-07T11:21:10.747-04:00",
  money_release_schema: null,
  money_release_status: null,
  notification_url: null,
  operation_type: "regular_payment",
  order: { id: "11622540370", type: "mercadopago" },
  payer: {
    first_name: null,
    last_name: null,
    email: "test_user_80507629@testuser.com",
    identification: { number: "32659430", type: "DNI" },
    phone: { area_code: null, number: null, extension: null },
    type: null,
    entity_type: null,
    id: "1472074575",
  },
  payment_method: { id: "visa", issuer_id: "1056", type: "credit_card" },
  payment_method_id: "visa",
  payment_type_id: "credit_card",
  platform_id: null,
  point_of_interaction: {
    business_info: { sub_unit: "checkout_pro", unit: "online_payments" },
    transaction_data: { e2e_id: null },
    type: "CHECKOUT",
  },
  pos_id: null,
  processing_mode: "aggregator",
  refunds: [],
  shipping_amount: 0,
  sponsor_id: null,
  statement_descriptor: "CAJU1009313",
  status: "approved",
  status_detail: "accredited",
  store_id: null,
  tags: null,
  taxes_amount: 0,
  transaction_amount: 10,
  transaction_amount_refunded: 0,
  transaction_details: {
    acquirer_reference: null,
    external_resource_url: null,
    financial_institution: null,
    installment_amount: 10,
    net_received_amount: 8.35,
    overpaid_amount: 0,
    payable_deferral_period: null,
    payment_method_reference_id: null,
    total_paid_amount: 10,
  },
};

const res = {
  results: [
    {
      metadata: {
        booking_id: 40,
        identifier: "cal.com",
        event_name: "60min between Free First Hidden Example and Free First Hidden Example",
        booker_email: "free-first-hidden@example.com",
      },
      corporation_id: null,
      operation_type: "regular_payment",
      point_of_interaction: {
        business_info: { unit: "online_payments", sub_unit: "checkout_pro" },
        transaction_data: { e2e_id: null },
        type: "CHECKOUT",
      },
      fee_details: [{ amount: 1.65, fee_payer: "collector", type: "mercadopago_fee" }],
      notification_url: null,
      date_approved: "2023-09-07T11:21:10.747-04:00",
      money_release_schema: null,
      payer: {
        first_name: null,
        last_name: null,
        email: "test_user_80507629@testuser.com",
        identification: { number: "32659430", type: "DNI" },
        phone: { area_code: null, number: null, extension: null },
        type: null,
        entity_type: null,
        id: "1472074575",
      },
      transaction_details: {
        total_paid_amount: 10,
        acquirer_reference: null,
        installment_amount: 10,
        financial_institution: null,
        net_received_amount: 8.35,
        overpaid_amount: 0,
        external_resource_url: null,
        payable_deferral_period: null,
        payment_method_reference_id: null,
      },
      statement_descriptor: "CAJU1009313",
      call_for_authorize_id: null,
      installments: 1,
      pos_id: null,
      external_reference: "66ea31e7-6cc7-43ec-9f59-079d9d4c053e",
      date_of_expiration: null,
      charges_details: [],
      id: 1317707223,
      payment_type_id: "credit_card",
      payment_method: { issuer_id: "1056", id: "visa", type: "credit_card" },
      order: { id: "11622540370", type: "mercadopago" },
      counter_currency: null,
      money_release_status: null,
      brand_id: null,
      status_detail: "accredited",
      tags: null,
      differential_pricing_id: null,
      additional_info: {
        authentication_code: null,
        ip_address: "181.65.19.242",
        nsu_processadora: null,
        available_balance: null,
        items: [
          {
            quantity: "1",
            category_id: "services",
            picture_url: null,
            description: null,
            id: "2",
            title: "60min between Free First Hidden Example and Free First Hidden Example",
            unit_price: "10",
          },
        ],
      },
      live_mode: false,
      marketplace_owner: 335900825,
      card: {
        first_six_digits: "450995",
        expiration_year: 2025,
        date_created: "2023-09-07T11:21:10.000-04:00",
        expiration_month: 11,
        id: null,
        cardholder: { identification: { number: "70246112", type: "DNI" }, name: "Tester Test" },
        last_four_digits: "3704",
        date_last_updated: "2023-09-07T11:21:10.000-04:00",
      },
      integrator_id: null,
      status: "approved",
      accounts_info: null,
      transaction_amount_refunded: 0,
      transaction_amount: 10,
      description: "60min between Free First Hidden Example and Free First Hidden Example",
      financing_group: null,
      money_release_date: "2023-09-07T11:21:10.747-04:00",
      merchant_number: null,
      refunds: [],
      authorization_code: null,
      captured: true,
      collector_id: 335900825,
      merchant_account_id: null,
      taxes_amount: 0,
      date_last_updated: "2023-09-07T11:21:10.747-04:00",
      coupon_amount: 0,
      store_id: null,
      build_version: "3.15.1",
      date_created: "2023-09-07T11:21:10.525-04:00",
      sponsor_id: null,
      shipping_amount: 0,
      issuer_id: "1056",
      payment_method_id: "visa",
      binary_mode: false,
      platform_id: null,
      deduction_schema: null,
      processing_mode: "aggregator",
      currency_id: "PEN",
      shipping_cost: 0,
    },
  ],
  paging: { total: 1, limit: 30, offset: 0 },
};
