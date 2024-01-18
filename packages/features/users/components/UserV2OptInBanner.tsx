import { useSession } from "next-auth/react";

import {
  APP_NAME,
  FUTURE_ROUTES_OVERRIDE_COOKIE_NAME as COOKIE_NAME,
  IS_CALCOM,
} from "@calcom/lib/constants";
import { TopBanner } from "@calcom/ui";

/** Repurposing this component so we can opt-in and out from app router */
function UserV2OptInBanner() {
  const session = useSession();

  // Only show on client-side
  if (typeof document === "undefined") return null;
  // Only Admins can opt-in for now
  if (session.data?.user.role !== "ADMIN") return null;
  // Only Cal.com ADMINs can opt-in for now, also show on dev
  if (process.env.NODE_ENV === "production" && !IS_CALCOM) return null;

  const hasV2OptInCookie = document.cookie.includes(`${COOKIE_NAME}=1`);

  if (hasV2OptInCookie)
    return (
      <TopBanner
        text={`You're using the future version of ${APP_NAME}.`}
        variant="warning"
        actions={
          <a href="/api/future-opt-in" className="border-b border-b-black">
            Go back
          </a>
        }
      />
    );

  return (
    <TopBanner
      text={`Want to try the future version of ${APP_NAME}? (Only Cal.com admins can see this)`}
      variant="warning"
      actions={
        <a href="/api/future-opt-in" className="border-b border-b-black">
          Opt-in to future routes
        </a>
      }
    />
  );
}

export default UserV2OptInBanner;
