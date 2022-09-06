import { Alert } from "@calcom/ui/Alert";
import { Alert as AlertV2 } from "@calcom/ui/v2/core/Alert";

function UserV2OptInBanner() {
  // Only show on client-side
  if (typeof document === "undefined") return null;

  const hasV2OptInCookie = document.cookie.includes("calcom-v2-early-access=1");

  if (hasV2OptInCookie)
    return (
      <AlertV2
        severity="info"
        title={
          <>
            You&apos;re using the new version of Cal.com.{" "}
            <a href="/api/v2-opt-in" className="underline">
              Go back to previous version
            </a>
            .
          </>
        }
        className="mb-2"
      />
    );

  return (
    <Alert
      severity="info"
      title={
        <>
          Want to try the new version of Cal.com?{" "}
          <a href="/api/v2-opt-in" className="underline">
            Opt-in to our V2 beta
          </a>
          .
        </>
      }
      className="mb-2"
    />
  );
}

export default UserV2OptInBanner;
