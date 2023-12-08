import NotFoundPage from "@pages/404";
import { ssgInit } from "app/_trpc/ssgInit";
import { headers } from "next/headers";

import PageWrapper from "@components/PageWrapperAppDir";

const getProps = async () => {
  const ssg = await ssgInit();

  return {
    dehydratedState: await ssg.dehydrate(),
  };
};

const NotFound = async () => {
  const nonce = headers().get("x-nonce") ?? undefined;
  const props = await getProps();

  return (
    <PageWrapper getLayout={null} requiresLicense={false} nonce={nonce} themeBasis={null} {...props}>
      <NotFoundPage />
    </PageWrapper>
  );
};

export const dynamic = "force-static";

export default NotFound;
