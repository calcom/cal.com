import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import EditWebhooksView from "~/settings/platform/oauth-clients/[clientId]/edit/edit-webhooks-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "OAuth client updation form",
    () => ""
  );

export default WithLayout({
  getLayout: null,
  Page: EditWebhooksView,
});
