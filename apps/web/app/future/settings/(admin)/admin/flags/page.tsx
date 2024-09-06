import { _generateMetadata } from "app/_utils";

import { FlagListingView } from "@calcom/features/flags/pages/flag-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Feature Flags",
    () => "Here you can toggle your Cal.com instance features."
  );

const Page = async () => {
  return (
    <SettingsHeader title="Feature Flags" description="Here you can toggle your Cal.com instance features.">
      <FlagListingView />
    </SettingsHeader>
  );
};

export default Page;
