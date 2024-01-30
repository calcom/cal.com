import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import Page from "@calcom/features/ee/users/pages/users-listing-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayoutAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Users",
    () => "A list of all the users in your account including their name, title, email and role."
  );

export default WithLayout({ getLayout, Page })<"P">;
