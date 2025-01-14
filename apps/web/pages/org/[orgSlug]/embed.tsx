import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from "./index";

export { default } from "./index";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
