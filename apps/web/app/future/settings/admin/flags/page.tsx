import { _generateMetadata } from "app/_utils";

import FlagListingView from "~/settings/admin/flags/flag-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Feature Flags",
    () => "Here you can toggle your Cal.com instance features."
  );

export default FlagListingView;
