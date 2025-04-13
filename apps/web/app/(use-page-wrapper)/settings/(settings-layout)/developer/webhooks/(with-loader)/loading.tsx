import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { SkeletonLoader } from "@calcom/features/webhooks/pages/webhooks-view";

export default function Loading() {
  return (
    <SettingsHeader
      title="Webhooks"
      description="Receive meeting data in real-time when something happens in Cal.com"
      borderInShellHeader={true}
      CTA={null}>
      <SkeletonLoader />
    </SettingsHeader>
  );
}
