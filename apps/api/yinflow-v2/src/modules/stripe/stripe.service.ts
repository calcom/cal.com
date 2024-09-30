import { Injectable } from "@nestjs/common";
import Stripe from "stripe";

import { getEnv } from "../../env";

@Injectable()
export class StripeService {
  public stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(getEnv("STRIPE_API_KEY"), {
      apiVersion: "2020-08-27",
    });
  }
}
