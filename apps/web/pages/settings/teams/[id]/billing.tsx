import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

import BillingPage from "../../billing";

const Page = BillingPage as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
