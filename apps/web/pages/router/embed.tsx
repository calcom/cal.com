import { getServerSideProps as _getServerSideProps } from "../../server/lib/router/getServerSideProps";

export { default } from "./index";
// We are not using withEmbedSsr here because _getServerSideProps already has the logic to append /embed to the redirect URL and it ends up as /embed/embed
// TODO: We should use withEmbedSsr here and remove the logic from _getServerSideProps
export const getServerSideProps = _getServerSideProps;
