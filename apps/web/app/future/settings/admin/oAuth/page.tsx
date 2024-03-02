import LegacyPage from "@pages/settings/admin/oAuth/index";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getLayout } from "@components/auth/layouts/AdminLayoutAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "OAuth",
    () => "Add new OAuth Clients"
  );

export default WithLayout({ getLayout, Page: LegacyPage })<"P">;
