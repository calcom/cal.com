import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/users/views/users-type-public-view";
import TypePage from "~/users/views/users-type-public-view";

export { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps.pages";

const Type = (props: PageProps) => <TypePage {...props} />;

Type.PageWrapper = PageWrapper;

export default Type;
