import DirectorySyncUserView from "@calcom/features/ee/dsync/page/user-dsync-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = DirectorySyncUserView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
