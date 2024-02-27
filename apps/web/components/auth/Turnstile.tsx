import type { TurnstileProps } from "react-turnstile";
import Turnstile from "react-turnstile";

import { CLOUDFLARE_SITE_ID } from "@calcom/lib/constants";

type Props = Omit<TurnstileProps, "sitekey">;

export default function TurnstileWidget(props: Props) {
  if (!CLOUDFLARE_SITE_ID) return null;

  return <Turnstile {...props} sitekey={CLOUDFLARE_SITE_ID} theme="auto" />;
}
