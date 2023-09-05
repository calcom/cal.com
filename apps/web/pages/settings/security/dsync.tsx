import DirectorySyncView from "@calcom/features/ee/dsync/page/index";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = DirectorySyncView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
