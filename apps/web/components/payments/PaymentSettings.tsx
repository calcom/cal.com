// File: apps/web/components/payments/PaymentSettings.tsx

import React from "react";
import { t } from "i18next"; // use the shared i18n helper used in the project

export default function PaymentSettings() {
  return (
    <select name="paymentGateway" id="paymentGateway">
      <option value="stripe">{t("payments.gateway.stripe", "Stripe")}</option>
      <option value="lawpay">{t("payments.gateway.lawpay", "LawPay (AffiniPay)")}</option>
    </select>
  );
}
