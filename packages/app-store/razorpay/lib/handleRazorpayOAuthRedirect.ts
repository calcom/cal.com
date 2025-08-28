import type { ParsedUrlQuery } from "querystring";

import {
  IS_PRODUCTION,
  RAZORPAY_CLIENT_ID,
  RAZORPAY_CLIENT_SECRET,
  RAZORPAY_REDIRECT_URL,
  RAZORPAY_STATE_KEY,
} from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { default as Razorpay } from "./Razorpay";

const handleRazorpayOAuthRedirect = async (query: ParsedUrlQuery, userId: number) => {
  const { code, state } = query;

  if (!code || !state || state !== RAZORPAY_STATE_KEY) {
    throw new Error("Razorpay oauth response malformed");
  }

  const res = await fetch("https://auth.razorpay.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: RAZORPAY_CLIENT_ID,
      client_secret: RAZORPAY_CLIENT_SECRET,
      grant_type: "authorization_code",
      redirect_uri: RAZORPAY_REDIRECT_URL,
      code,
      mode: IS_PRODUCTION ? "live" : "test",
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch razorpay token");
  }
  const { access_token, refresh_token, public_token, razorpay_account_id } = await res.json();

  //TODO:razorpay webhook setup
  //setting up webhooks on user account programmatically
  const razorpay = new Razorpay({
    access_token,
    refresh_token,
    user_id: userId,
  });

  const didCreate = await razorpay.createWebhooks(razorpay_account_id);
  if (!didCreate) {
    throw new Error("Failed to create webhooks for user");
  }
  const installation = await prisma.credential.create({
    data: {
      type: "razorpay_payment",
      key: {
        access_token,
        refresh_token,
        public_token,
        account_id: razorpay_account_id,
        userId: userId,
      },
      userId: userId,
      appId: "razorpay",
    },
  });
  if (!installation) {
    throw new Error("Unable to create user credential for Razorpay");
  }
};

export default handleRazorpayOAuthRedirect;
