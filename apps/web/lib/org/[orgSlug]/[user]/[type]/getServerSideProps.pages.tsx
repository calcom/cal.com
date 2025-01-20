import { withPagesCsrf } from "@calcom/features/csrf/with-pages-csrf";

import { getServerSideProps as _getServerSideProps } from "./getServerSideProps";

export const getServerSideProps = withPagesCsrf(_getServerSideProps);
