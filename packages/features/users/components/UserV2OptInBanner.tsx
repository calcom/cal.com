import { APP_NAME } from "@calcom/lib/constants";

function UserV2OptInBanner() {
  // Only show on client-side
  if (typeof document === "undefined") return null;

  const hasV2OptInCookie = document.cookie.includes("calcom-v2-early-access=1");

  if (hasV2OptInCookie)
    return (
      <p className="text-xs text-gray-400">
        You&apos;re using the new version of {APP_NAME}.{" "}
        <a href="/api/v2-opt-in" className="text-blue-400 underline">
          Go back
        </a>
        .
      </p>
    );

  return (
    <p className="text-xs text-gray-400">
      Want to try the new version of {APP_NAME}?{" "}
      <a href="/api/v2-opt-in" className="text-blue-400 underline">
        Opt-in to our v2.0 beta
      </a>
      .
    </p>
  );
}

export default UserV2OptInBanner;
