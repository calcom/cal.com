import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useRef, useEffect } from "react";

import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

// Session flag stored in memory (persists for the window lifetime)
const sessionTracking = {
  hasIdentified: false,
  lastUserId: null as string | null,
};

// Type definitions for Customer.io Analytics
declare global {
  interface Window {
    cioanalytics?: {
      identify: (id: number, payload: Record<string, any>) => void;
      track: (event: string, properties?: Record<string, any>) => void;
      page: () => void;
      reset: () => void;
      // Add other methods as needed
    };
  }
}

function getFullNameFromField(name: string): [string, string] {
  if (!name) return ["", ""];

  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["", ""];

  const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

  const firstName = capitalize(words[0]);
  const lastName = words.length > 1 ? words.slice(1).map(capitalize).join(" ") : "";

  return [firstName, lastName];
}

/**
 * Initializes Customer.io Analytics script
 */
function CustomerIOInitializer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already initialized
    if (window.cioanalytics && (window.cioanalytics as any).invoked) {
      return;
    }

    const script = `
      !function(){
        var i="cioanalytics", analytics=(window[i]=window[i]||[]);
        if(!analytics.initialize) {
          if(analytics.invoked) {
            window.console && console.error && console.error("Snippet included twice.");
          } else {
            analytics.invoked = !0;
            analytics.methods = [
              "trackSubmit","trackClick","trackLink","trackForm","pageview","identify",
              "reset","group","track","ready","alias","debug","page","once","off","on",
              "addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware"
            ];
            analytics.factory = function(e) {
              return function() {
                var t = Array.prototype.slice.call(arguments);
                t.unshift(e);
                analytics.push(t);
                return analytics;
              };
            };
            for (var e = 0; e < analytics.methods.length; e++) {
              var key = analytics.methods[e];
              analytics[key] = analytics.factory(key);
            }
            analytics.load = function(key, e) {
              var t = document.createElement("script");
              t.type = "text/javascript";
              t.async = !0;
              t.setAttribute("data-global-customerio-analytics-key", i);
              t.src = "https://cdp.customer.io/v1/analytics-js/snippet/" + key + "/analytics.min.js";
              var n = document.getElementsByTagName("script")[0];
              n.parentNode.insertBefore(t, n);
              analytics._writeKey = key;
              analytics._loadOptions = e;
            };
            analytics.SNIPPET_VERSION = "4.15.3";
            analytics.load("fa6d11bb6fbfbf91cf0d");
            analytics.page();
          }
        }
      }();
    `;

    const scriptElement = document.createElement("script");
    scriptElement.text = script;
    document.head.appendChild(scriptElement);

    return () => {
      // Cleanup if needed
    };
  }, []);

  return null;
}

/**
 * Initializes PostHog Analytics
 */
function PostHogInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already initialized
    if (posthog.__loaded) {
      return;
    }

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest",
      ui_host: "https://us.posthog.com",
      capture_exceptions: true,
      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") ph.debug();
      },
      debug: process.env.NODE_ENV === "development",
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

/**
 * Tracks page views on route changes (App Router compatible)
 */
function PostHogPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = `${url}?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

/**
 * Handles user identification for all analytics services
 */
function UserIdentificationProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const { data: user, isLoading } = useMeQuery();
  const hasRunRef = useRef(false);

  const { data: statsData } = trpc.viewer.me.myStats.useQuery(undefined, {
    trpc: {
      context: {
        skipBatch: true,
      },
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!session?.data && !sessionTracking.hasIdentified,
  });

  useEffect(() => {
    // Early return if already run in this render cycle
    if (hasRunRef.current) return;

    // Early return if no session or stats data
    if (!session?.data || !statsData) return;

    // Handle logged out state
    if (!user) {
      if (sessionTracking.hasIdentified) {
        posthog.reset(true);
        if (window.cioanalytics && typeof window.cioanalytics.reset === "function") {
          window.cioanalytics.reset();
        }
        sessionTracking.hasIdentified = false;
        sessionTracking.lastUserId = null;
      }
      return;
    }

    const userId = String(user.id);

    // Skip if already identified this user in this session
    if (sessionTracking.hasIdentified && sessionTracking.lastUserId === userId) {
      return;
    }

    // Mark as run for this component instance
    hasRunRef.current = true;

    const {
      id,
      email,
      name,
      username,
      createdDate: createdAt,
      completedOnboarding,
      customBrandingEnabled,
      timeZone: timezone,
      emailVerified,
    } = {
      ...session.data.user,
      ...user, // User has more up to date fields
    };

    const [first_name, last_name] = name ? getFullNameFromField(name) : ["", ""];

    const trackingPayload = {
      id,
      email,
      first_name,
      last_name,
      created_at: createdAt ? Math.floor(new Date(createdAt).getTime() / 1000) : undefined,
      slug: username,
      onboarding_completed: completedOnboarding,
      custom_branding: customBrandingEnabled,
      email_verified: !!emailVerified,
      timezone,
      lifetime_meetings: statsData.sumOfBookings,
      availability_configured: statsData.availability_configured,
      integrations_connected: statsData.integrations_connected,
      branding_configured: statsData.branding_configured,
      workflows_configured: statsData.workflows_configured,
      setup_items_completed: statsData.setup_items_completed,
    };

    // Identify with PostHog
    posthog.identify(userId, trackingPayload);

    // Identify with CIO Analytics
    const identifyWithCIO = (retryCount = 0, maxRetries = 10) => {
      if (
        typeof window !== "undefined" &&
        window.cioanalytics &&
        typeof window.cioanalytics.identify === "function"
      ) {
        try {
          window.cioanalytics.identify(id, trackingPayload);
        } catch (error) {
          console.error("Error identifying user with CIO Analytics:", error);
        }
      } else if (retryCount < maxRetries) {
        setTimeout(() => {
          identifyWithCIO(retryCount + 1, maxRetries);
        }, 100 * Math.pow(2, retryCount));
      } else {
        console.warn("CIO Analytics not available after maximum retries");
      }
    };

    identifyWithCIO();

    // Mark as identified for this session
    sessionTracking.hasIdentified = true;
    sessionTracking.lastUserId = userId;
  }, [session?.data, statsData]);

  return <>{children}</>;
}

/**
 * Global Customer Engagement Provider
 * Initializes and manages all customer engagement/analytics services
 **/
export default function CustomerEngagementProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CustomerIOInitializer />
      <PostHogInitializer>
        <PostHogPageViewTracker />
        <UserIdentificationProvider>{children}</UserIdentificationProvider>
      </PostHogInitializer>
    </>
  );
}
