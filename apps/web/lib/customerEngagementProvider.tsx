import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { useRef, useEffect } from "react";

import { trpc } from "@calcom/trpc/react";

// Session flag stored in memory (persists for the window lifetime)
const sessionTracking = {
  hasIdentified: false,
  lastUserId: null as string | null,
};

function getFullNameFromField(name: string): [string, string] {
  if (!name) return ["", ""];

  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["", ""];

  const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

  const firstName = capitalize(words[0]);
  const lastName = words.length > 1 ? words.slice(1).map(capitalize).join(" ") : "";

  return [firstName, lastName];
}
function CustomerEngagementProviders({ children }: { children: React.ReactNode }) {
  const session = useSession();
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

    const user = session.data.user;

    // Handle logged out state
    if (!user) {
      if (sessionTracking.hasIdentified) {
        posthog.reset(true);
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
    } = user;

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
export default CustomerEngagementProviders;
