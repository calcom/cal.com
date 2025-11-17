import { GoogleTagManager } from "@next/third-parties/google";

import { useGeolocation } from "@calcom/lib/analytics/geolocation";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export function GoogleTagManagerComponent() {
  const { isUS, loading } = useGeolocation();

  if (!isUS || !GTM_ID || loading) {
    return null;
  }

  return <GoogleTagManager gtmId={GTM_ID} />;
}
