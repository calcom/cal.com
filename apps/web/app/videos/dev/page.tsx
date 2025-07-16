// apps/web/app/videos/dev/page.tsx
import { LogInOverlay } from "~/videos/views/videos-single-view";

export default function Dev() {
  return <LogInOverlay isLoggedIn={false} bookingUid="demo123" />;
}
