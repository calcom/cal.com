import { CLOUDFLARE_SITE_ID } from "@calcom/lib/constants";
import type { TurnstileProps } from "react-turnstile";
import Turnstile from "react-turnstile";

type Props = Omit<TurnstileProps, "sitekey">;

export default function TurnstileWidget(props: Props) {
  if (!CLOUDFLARE_SITE_ID || process.env.NEXT_PUBLIC_IS_E2E) return null;

  return <Turnstile {...props} sitekey={CLOUDFLARE_SITE_ID} theme="auto" />;
}
