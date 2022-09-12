import { useEffect, useState } from "react";

function UserV2OptInBanner() {
  const [v2OptInCookie, setV2OptInCookie] = useState<boolean | null>(null);
  // Only show on client-side
  useEffect(() => {
    setV2OptInCookie(document.cookie.includes("calcom-v2-early-access=1"));
  }, []);

  if (!v2OptInCookie) {
    return null;
  }
  if (v2OptInCookie)
    return (
      <p className="text-xs text-gray-400">
        You&apos;re using the new version of Cal.com.{" "}
        <a href="/api/v2-opt-in" className="text-blue-400 underline">
          Go back
        </a>
        .
      </p>
    );

  return (
    <p className="text-xs text-gray-400">
      Want to try the new version of Cal.com?{" "}
      <a href="/api/v2-opt-in" className="text-blue-400 underline">
        Opt-in to our v2.0 beta
      </a>
      .
    </p>
  );
}

export default UserV2OptInBanner;
