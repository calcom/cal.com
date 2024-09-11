import { _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";

import { FlagListingView } from "@calcom/features/flags/pages/flag-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { FeatureFlagRepository } from "@calcom/lib/server/repository/featureFlag";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Feature Flags",
    () => "Here you can toggle your Cal.com instance features."
  );

const Page = async () => {
  try {
    const featureFlags = await FeatureFlagRepository.getFeatureFlags();
    return (
      <SettingsHeader title="Feature Flags" description="Here you can toggle your Cal.com instance features.">
        <FlagListingView ssrProps={{ featureFlags }} />
      </SettingsHeader>
    );
  } catch (error) {
    notFound();
  }
};

export default Page;
