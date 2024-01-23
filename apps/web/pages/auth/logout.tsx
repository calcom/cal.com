import PageWrapper from "@components/PageWrapper";
import Logout from "@components/pages/auth/logout";

import { getServerSideProps } from "@server/lib/auth/logout/getServerSideProps";

Logout.PageWrapper = PageWrapper;
export default Logout;

export { getServerSideProps };
