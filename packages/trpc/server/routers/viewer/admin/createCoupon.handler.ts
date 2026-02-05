import * as crypto from "node:crypto";
import { z } from "zod";

import { CALCOM_PRIVATE_API_ROUTE } from "@calcom/lib/constants";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateCouponSchema } from "./createCoupon.schema";

type CreateCouponOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateCouponSchema;
};

const generateNonce = (): string => {
  return crypto.randomBytes(16).toString("hex");
};

const createSignature = (body: Record<string, unknown>, nonce: string, secretKey: string): string => {
  return crypto
    .createHmac("sha256", secretKey)
    .update(JSON.stringify(body) + nonce)
    .digest("hex");
};

const fetchWithSignature = async (
  url: string,
  body: Record<string, unknown>,
  secretKey: string,
  options: RequestInit = {}
): Promise<Response> => {
  const nonce = generateNonce();
  const signature = createSignature(body, nonce, secretKey);

  const headers = {
    ...options.headers,
    "Content-Type": "application/json",
    nonce: nonce,
    signature: signature,
  };

  return await fetch(url, {
    ...options,
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  });
};

const createCoupon = async ({ input, ctx }: CreateCouponOptions) => {
  const privateApiUrl = CALCOM_PRIVATE_API_ROUTE;
  const signatureToken = process.env.CAL_SIGNATURE_TOKEN;

  if (!privateApiUrl || !signatureToken) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Private API route is not configured" });
  }

  if (ctx.user.role !== "ADMIN") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You do not have permission to do this" });
  }

  const request = await fetchWithSignature(`${privateApiUrl}/v1/license/coupon`, input, signatureToken, {
    method: "POST",
  });

  const data = await request.json();

  if (!request.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: data.message ?? "Failed to create coupon" });
  }

  const schema = z.object({
    promotionCode: z.string(),
    couponId: z.string(),
  });

  return schema.parse(data);
};

export default createCoupon;
