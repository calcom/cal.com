import withEmbedSsr from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";

import { getServerSideProps as _getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";

import type { PageProps } from "~/users/views/users-type-public-view";
import TypePage from "~/users/views/users-type-public-view";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);

const Type = (props: PageProps) => <TypePage {...props} />;

Type.PageWrapper = PageWrapper;

export default Type;
