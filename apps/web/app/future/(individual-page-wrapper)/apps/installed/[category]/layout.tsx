import { type ReactElement } from "react";

import PageWrapper from "@components/PageWrapperAppDir";

type EventTypesLayoutProps = {
  children: ReactElement;
};

export default function Layout({ children }: EventTypesLayoutProps) {
  return (
    <PageWrapper getLayout={null} requiresLicense={false} nonce={undefined} themeBasis={null}>
      {children}
    </PageWrapper>
  );
}
