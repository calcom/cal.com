import Script from "next/script";
import { z } from "zod";

const nonEmptySchema = z.string().min(1);

const apiUrl = process.env.NEXT_PUBLIC_CROW_API_URL;
const productId = process.env.NEXT_PUBLIC_CROW_PRODUCT_ID;

export const isCrowEnabled =
  nonEmptySchema.safeParse(apiUrl).success && nonEmptySchema.safeParse(productId).success;

export default function CrowScript() {
  if (!isCrowEnabled) return null;
  return (
    <Script
      id="crow-ai-sdk"
      src={`${apiUrl}/static/crow-widget.js`}
      data-product-id={productId}
      data-api-url={apiUrl}
      data-headless="true"
    />
  );
}
