import { PostHogProvider } from "posthog-js/react";
import type { FC } from "react";

const Provider: FC<{ children: React.ReactNode }> = ({ children }) => (
  <PostHogProvider
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY || ""}
    options={{
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      autocapture: false,
      persistence: "memory",
      request_batching: false,
    }}>
    {children}
  </PostHogProvider>
);

export default Provider;
