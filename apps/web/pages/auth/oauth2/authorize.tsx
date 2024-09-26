import PageWrapper from "@components/PageWrapper";

import Authorize from "~/auth/oauth2/authorize-view";

const Page = () => <Authorize />;
Page.PageWrapper = PageWrapper;
export default Page;
