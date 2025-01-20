import { withAppDirCsrf } from "@calcom/features/csrf/with-app-dir-csrf";

import { getServerSideProps as _getServerSideProps } from "./getServerSideProps";

export const getServerSideProps = withAppDirCsrf(_getServerSideProps);
