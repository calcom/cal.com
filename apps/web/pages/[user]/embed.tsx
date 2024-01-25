import { getServerSideProps as _getServerSideProps } from "@lib/[user]/getServerSideProps";
import withEmbedSsr from "@lib/withEmbedSsr";

export { default } from "../[user]";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
