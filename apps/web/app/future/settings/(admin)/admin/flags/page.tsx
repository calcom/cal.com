import { _generateMetadata, revalidateCache } from "app/_utils";
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
  const revalidate = async () => {
    "use server";
    revalidateCache("SETTINGS_ADMIN_FLAGS");
  };
  try {
    const [featureFlags, _map] = await Promise.all([
      FeatureFlagRepository.getFeatureFlags(),
      FeatureFlagRepository.getFeatureFlagMap(), // the returned value of this function isn't used explicitly but the fetch is called here to trigger invalidation
    ]);
    return (
      <SettingsHeader title="Feature Flags" description="Here you can toggle your Cal.com instance features.">
        <FlagListingView ssrProps={{ featureFlags }} revalidateCache={revalidate} />
      </SettingsHeader>
    );
  } catch (error) {
    notFound();
  }
};

export default Page;
