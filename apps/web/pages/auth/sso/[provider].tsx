import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";
import Provider from "@components/pages/auth/sso/[provider]";

import { getServerSideProps } from "@server/lib/auth/sso/[provider]/getServerSideProps";

export type SSOProviderPageProps = inferSSRProps<typeof getServerSideProps>;

Provider.PageWrapper = PageWrapper;
export default Provider;
export { getServerSideProps };
