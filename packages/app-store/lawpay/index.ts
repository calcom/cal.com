import { Integration } from "@calcom/types";
import { lawpayOAuthHandler } from "./lawpay.oauth";

export const lawpayIntegration: Integration = {
  id: "lawpay",
  name: "LawPay (AffiniPay)",
  description: "Compliant payment gateway for law firms with trust accounting support.",
  category: "payments",
  enabled: true,
  icon: "/integrations/lawpay.png",
  connect: lawpayOAuthHandler,
};
