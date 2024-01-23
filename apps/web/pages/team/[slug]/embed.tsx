import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from "../../team/[slug]";

export { default, type PageProps } from "../../team/[slug]";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
