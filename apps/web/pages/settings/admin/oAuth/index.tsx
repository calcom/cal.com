import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

import OAuthView from "~/settings/admin/oauth-view";

const OAuthPage = () => (
  <>
    <Meta title="OAuth" description="Add new OAuth Clients" />
    <OAuthView />
  </>
);

OAuthPage.getLayout = getLayout;
OAuthPage.PageWrapper = PageWrapper;

export default OAuthPage;
