import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";

import PageWrapper from "@components/PageWrapperAppDir";

import { NotFound } from "./notFoundClient";

export const generateMetadata = async () => {
  const metadata = await _generateMetadata(
    (t) => t("404_page_not_found"),
    (t) => t("404_page_not_found")
  );
  return {
    ...metadata,
    robots: {
      index: false,
      follow: false,
    },
  };
};

const ServerPage = async () => {
  const h = await headers();
  const nonce = h.get("x-nonce") ?? undefined;
  return (
    <PageWrapper requiresLicense={false} nonce={nonce}>
      <NotFound />
    </PageWrapper>
  );
};
export default ServerPage;
