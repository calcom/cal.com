import withEmbedSsr from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";

import TypePage from "~/users/views/users-type-public-view";
import type { PageProps } from "~/users/views/users-type-public-view.getServerSideProps";
import { getServerSideProps as _getServerSideProps } from "~/users/views/users-type-public-view.getServerSideProps";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);

const Type = (props: PageProps) => <TypePage {...props} />;

Type.PageWrapper = PageWrapper;

export default Type;
