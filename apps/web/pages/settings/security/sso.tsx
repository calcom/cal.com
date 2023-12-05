import UserSSOView from "@calcom/features/ee/sso/page/user-sso-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = UserSSOView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
