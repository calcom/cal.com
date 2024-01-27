import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import Page from "@calcom/features/ee/users/pages/users-add-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayoutAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Add new user",
    () => "Here you can add a new user."
  );

export default WithLayout({ getLayout, Page })<"P">;
