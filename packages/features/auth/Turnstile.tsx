import { forwardRef, useImperativeHandle, useRef } from "react";
import type { TurnstileProps } from "react-turnstile";
import Turnstile from "react-turnstile";

import { CLOUDFLARE_SITE_ID } from "@calcom/lib/constants";

type Props = Omit<TurnstileProps, "sitekey">;

export type TurnstileInstance = {
  reset: () => void;
};

const TurnstileWidget = forwardRef<TurnstileInstance, Props>((props, ref) => {
  const innerRef = useRef<{ reset?: () => void } | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      innerRef.current?.reset?.();
    },
  }));

  if (!CLOUDFLARE_SITE_ID || process.env.NEXT_PUBLIC_IS_E2E) return null;

  // @ts-expect-error - react-turnstile accepts ref at runtime but types don't include it
  return <Turnstile {...props} ref={innerRef} sitekey={CLOUDFLARE_SITE_ID} theme="auto" />;
});

TurnstileWidget.displayName = "TurnstileWidget";

export default TurnstileWidget;
