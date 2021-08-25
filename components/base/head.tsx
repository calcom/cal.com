import Head from "next/head";
import React, { FC, ReactNode } from "react";

type PageHeadProps = {
  children?: ReactNode;
  title: string | string[] | undefined;
};

export const PageHead: FC<PageHeadProps> = (props) => {
  const { children, title } = props;

  return (
    <Head>
      <title>{title} | Calendso</title>
      <link rel="icon" href="/favicon.ico" />
      {children ? children : null}
    </Head>
  );
};

PageHead.defaultProps = {};
