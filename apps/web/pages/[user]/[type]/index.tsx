import PageWrapper from "@components/PageWrapper";

import TypePage from "~/users/views/users-type-public-view";
import type { PageProps } from "~/users/views/users-type-public-view.getServerSideProps";

export { getServerSideProps } from "~/users/views/users-type-public-view.getServerSideProps";

const Type = (props: PageProps) => <TypePage {...props} />;

Type.PageWrapper = PageWrapper;

export default Type;
