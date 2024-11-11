// eslint-disable-next-line no-restricted-imports
import { noop } from "lodash";
import { PostHog, type PostHog as PostHogType } from "posthog-node";

let postHog: {
  capture: PostHogType["capture"];
  identify: PostHogType["identify"];
};

// eslint-disable-next-line turbo/no-undeclared-env-vars
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  postHog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
  });
} else {
  postHog = {
    capture: noop,
    identify: noop,
  };
}

export function postHogClient() {
  function capture(distinctId: string, event: string, properties?: Record<string, any>) {
    postHog?.capture({ distinctId, event, properties });
  }

  function identify(distinctId: string, properties?: Record<string, any>) {
    postHog?.identify({ distinctId, properties });
  }

  return {
    capture,
    identify,
  };
}

export default postHogClient;
