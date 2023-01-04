import { Tags } from "./BookingPageTagManager";
import { appScripts } from "./appScripts";

export default function AppTagManager() {
  const tags = Object.entries(appScripts).map(([appId, scriptConfig]) => {
    const trackingId = 1;
    if (!trackingId) {
      return null;
    }
    return {
      appId,
      scriptConfig,
      trackingId,
    };
  });
  return <Tags tags={tags} />;
}
