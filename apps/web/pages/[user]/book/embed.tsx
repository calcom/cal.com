import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from "../book";

export { default } from "../book";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
