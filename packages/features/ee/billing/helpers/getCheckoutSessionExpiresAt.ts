import { CHECKOUT_SESSION_EXPIRY_MINUTES } from "../constants";

export function getCheckoutSessionExpiresAt(): number {
  return Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_EXPIRY_MINUTES * 60;
}
